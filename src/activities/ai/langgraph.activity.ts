import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGroq } from '@langchain/groq';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { DatabaseActivity } from '../database.activity';
import { HttpActivity } from '../http.activity';
import { AiToolFactory } from './ai-tool.factory';
import { McpClientService, McpServerConfig } from './mcp-client.service';
import { z } from 'zod';

@Injectable()
export class LangGraphActivity {
  private readonly toolFactory: AiToolFactory;
  private readonly logger = new Logger(LangGraphActivity.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseActivity,
    private readonly http: HttpActivity,
    private readonly mcpService: McpClientService,
  ) {
    this.toolFactory = new AiToolFactory(db, http);
  }

  async runAgent(args: {
    systemPrompt: string;
    userPrompt: string;
    modelName?: string;
    boundTools: string[];
    mcpServers?: McpServerConfig[];
    maxRetries?: number;
    maxIterations?: number;
    outputFields?: any[];
  }) {
    this.logger.log(`[LangGraph] Starting Agent Execution: ${args.modelName}`);

    const googleModels = [
      'gemini-3-flash-preview',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
    ];
    const anthropicModels = [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20240620',
    ];
    const groqModels = [
      'llama3-8b-8192',
      'llama3-70b-8192',
      'mixtral-8x7b-32768',
      'gemma-1.1-7b-it',
      'openai/gpt-oss-20b',
    ];

    // Best free OpenRouter model for Agents: natively supports tools & JSON structure
    const DEFAULT_MODEL = 'google/gemini-2.0-flash-lite-preview-02-05:free';
    const modelName = args.modelName || DEFAULT_MODEL;
    let llm: any;

    // OpenRouter prefix detection — route through OpenRouter-compatible endpoint
    const openRouterPrefixes = [
      'nvidia/',
      'meta-llama/',
      'mistralai/',
      'openrouter/',
      'deepseek/',
      'qwen/',
      'cohere/',
      'perplexity/',
      'x-ai/',
      'microsoft/',
    ];
    const isOpenRouterModel =
      openRouterPrefixes.some((p) => modelName.startsWith(p)) ||
      modelName.includes(':free') ||
      modelName.includes(':nitro') ||
      modelName.includes(':extended');

    if (isOpenRouterModel) {
      llm = new ChatOpenAI({
        model: modelName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        apiKey: this.configService.get('OPENROUTER_API_KEY'),
        maxTokens: 1024, // cap to avoid 402 on free-tier models
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Agent Flow',
          },
        },
        temperature: 0,
      });
    } else if (googleModels.some((m) => modelName.includes(m))) {
      llm = new ChatGoogleGenerativeAI({
        model: modelName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        apiKey: this.configService.get('GOOGLE_GEMINI_API_KEY'),
        temperature: 0,
      });
    } else if (anthropicModels.some((m) => modelName.includes(m))) {
      llm = new ChatAnthropic({
        model: modelName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        apiKey: this.configService.get('ANTHROPIC_API_KEY'),
        temperature: 0,
      });
    } else if (groqModels.some((m) => modelName.includes(m))) {
      llm = new ChatGroq({
        model: modelName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        apiKey: this.configService.get('GROQ_API_KEY'),
        temperature: 0,
      });
    } else {
      // Default fallback: route through OpenRouter (supports GPT-4o, GPT-4-turbo, etc.)
      llm = new ChatOpenAI({
        model: modelName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        apiKey: this.configService.get('OPENROUTER_API_KEY'),
        maxTokens: 1024, // cap to avoid 402 on free-tier models
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'Agent Flow',
          },
        },
        temperature: 0,
      });
    }

    // 1. Gather traditional tools
    const lcTools: any[] = this.toolFactory.getTools(args.boundTools || []);

    // 2. Load MCP Tools dynamically
    if (args.mcpServers && Array.isArray(args.mcpServers)) {
      for (const serverInput of args.mcpServers as any[]) {
        try {
          // If the UI passes just the string ID, we need to look it up in the DB
          let serverConfig: McpServerConfig;

          if (typeof serverInput === 'string') {
            this.logger.log(
              `[LangGraph] Looking up MCP Server by ID: ${serverInput}`,
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
            const queryResult = await this.db.executeSqlQuery({
              query: `SELECT id, name, "transportType", config FROM mcp_servers WHERE id = $1`,
              params: [serverInput],
            });

            if (Array.isArray(queryResult) && queryResult.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
              const row = queryResult[0];
              serverConfig = {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
                id: row.id,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
                command: row.config.command,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
                args: row.config.args || [],
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
                env: row.config.env || {},
              };
            } else {
              this.logger.warn(
                `[LangGraph] MCP Server ID ${serverInput} not found in DB.`,
              );
              continue;
            }
          } else {
            // It's already an object (used by other tests/legacy)
            serverConfig = serverInput as McpServerConfig;
          }

          const client = await this.mcpService.getClient(serverConfig);
          const toolsRes = await client.listTools();

          for (const mcpTool of toolsRes.tools) {
            this.logger.log(
              `Registering MCP Tool: ${mcpTool.name} from server ${serverConfig.id}`,
            );

            const dynamicTool = new DynamicStructuredTool({
              name: mcpTool.name,
              description:
                mcpTool.description ||
                `Tool ${mcpTool.name} from ${serverConfig.id}`,
              schema: z.any().describe(JSON.stringify(mcpTool.inputSchema)),
              func: async (inputArgs: any) => {
                this.logger.log(
                  `Calling MCP tool ${mcpTool.name} with ${JSON.stringify(inputArgs)}`,
                );
                const result = await client.callTool({
                  name: mcpTool.name,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
                  arguments: inputArgs,
                });
                return JSON.stringify(result.content);
              },
            });
            lcTools.push(dynamicTool);
          }
        } catch (e) {
          this.logger.error(`Failed to load MCP server ${serverInput}`, e);
        }
      }
    }

    // 3. Define the LangGraph Agent
    const agent = createReactAgent({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
      llm,
      tools: lcTools,
      messageModifier: new SystemMessage(
        args.systemPrompt || 'You are a helpful assistant.',
      ),
    });

    // 4. Run the graph
    const inputs = {
      messages: [new HumanMessage(args.userPrompt)],
    };

    const result = await agent.invoke(inputs, {
      recursionLimit: args.maxIterations || 10,
    });

    const finalMessage = result.messages[result.messages.length - 1];

    return this.handleOutputParsing(finalMessage.content, args.outputFields);
  }

  private handleOutputParsing(text: any, outputFields?: any[]) {
    const textStr = typeof text === 'string' ? text : JSON.stringify(text);
    if (!outputFields || outputFields.length === 0) {
      return { text: textStr } as unknown;
    }
    try {
      return JSON.parse(textStr) as unknown;
    } catch {
      return { text: textStr } as unknown;
    }
  }
}
