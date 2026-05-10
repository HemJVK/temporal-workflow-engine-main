import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGroq } from '@langchain/groq';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool, tool } from '@langchain/core/tools';
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
    userId?: string;
    config?: any;
    query?: string;
  }) {

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
    const openRouterModels = [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'qwen/qwen3.6-plus:free',
      'nvidia/nemotron-nano-12b-v2-vl:free',
    ];

    const DEFAULT_MODEL = 'gpt-4o';
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
        apiKey: this.configService.get<string>('OPENROUTER_API_KEY')?.split(',')[0].trim(),
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
        apiKey: this.configService.get<string>('GOOGLE_GEMINI_API_KEY')?.split(',')[0].trim(),
        temperature: 0,
      });
    } else if (anthropicModels.some((m) => modelName.includes(m))) {
      llm = new ChatAnthropic({
        model: modelName,
        apiKey: this.configService.get<string>('ANTHROPIC_API_KEY')?.split(',')[0].trim(),
        temperature: 0,
      });
    } else if (groqModels.some((m) => modelName.includes(m))) {
      llm = new ChatGroq({
        model: modelName,
        apiKey: this.configService.get<string>('GROQ_API_KEY')?.split(',')[0].trim(),
        temperature: 0,
      });
    } else {
      // Default fallback: use OpenAI directly for reliable tool-calling
      llm = new ChatOpenAI({
        model: modelName,
        apiKey: this.configService.get<string>('OPENAI_API_KEY')?.split(',')[0].trim(),
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
            const queryResult = await this.db.executeSqlQuery({
              query: `SELECT id, name, "transportType", config FROM mcp_servers WHERE id = $1`,
              params: [serverInput],
            });

            if (Array.isArray(queryResult) && queryResult.length > 0) {
              const row = queryResult[0];
              serverConfig = {
                id: row.id,
                command: row.config.command,
                args: row.config.args || [],
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
            serverConfig = {
              ...(serverInput as McpServerConfig),
            };
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
              schema: this.jsonSchemaToZod(mcpTool.inputSchema) as any,
              func: async (inputArgs: any) => {
                this.logger.log(
                  `Calling MCP tool ${mcpTool.name} with ${JSON.stringify(inputArgs)}`,
                );
                const result = await client.callTool({
                  name: mcpTool.name,
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
    const systemPrompt = args.systemPrompt || args.config?.systemPrompt || args.config?.system_prompt || '';
    const userPrompt = args.userPrompt || args.query || args.config?.userPrompt || args.config?.prompt || args.config?.query || '';

    if (!systemPrompt && !userPrompt) {
      throw new Error('Either systemPrompt or userPrompt must be provided in the node configuration.');
    }

    const agent = createReactAgent({
      llm,
      tools: lcTools,
      messageModifier: new SystemMessage(systemPrompt || 'You are a helpful assistant.'),
    });

    // 4. Run the graph
    const inputs = {
      messages: [new HumanMessage(userPrompt)],
    };

    const result = await agent.invoke(inputs, {
      recursionLimit: args.maxIterations || 10,
    });

    const finalMessage = result.messages[result.messages.length - 1];

    return this.handleOutputParsing(finalMessage.content, args.outputFields);
  }

  private handleOutputParsing(text: string | any, outputFields?: any[]) {
    let textStr = typeof text === 'string' ? text : JSON.stringify(text);

    // --- NEW: Strip Markdown Code Blocks ---
    // AI models often wrap JSON in ```json ... ``` or ``` ... ```
    if (textStr.includes('```')) {
      const match = textStr.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (match && match[1]) {
        textStr = match[1].trim();
      }
    }

    if (!outputFields || outputFields.length === 0) {
      // Even without outputFields, try to return a parsed object if it looks like JSON
      try {
        return JSON.parse(textStr);
      } catch {
        return { text: textStr };
      }
    }

    try {
      return JSON.parse(textStr);
    } catch {
      return { text: textStr };
    }
  }

  private jsonSchemaToZod(schema: any): z.ZodTypeAny {
    if (!schema) return z.any();
    const type = schema.type;

    if (type === 'string') {
      let s: any = z.string();
      if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
        // Zod requires at least one element for enum
        s = z.enum(schema.enum as [string, ...string[]]);
      }
      if (schema.description) s = s.describe(schema.description);
      return s;
    }
    if (type === 'number' || type === 'integer') {
      let n = z.number();
      if (schema.description) n = n.describe(schema.description);
      return n;
    }
    if (type === 'boolean') {
      let b = z.boolean();
      if (schema.description) b = b.describe(schema.description);
      return b;
    }
    if (type === 'array') {
      let a = z.array(this.jsonSchemaToZod(schema.items));
      if (schema.description) a = a.describe(schema.description);
      return a;
    }
    if (type === 'object') {
      if (schema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, value] of Object.entries<any>(schema.properties)) {
          let fieldSchema = this.jsonSchemaToZod(value);
          if (!schema.required?.includes(key)) {
            fieldSchema = fieldSchema.optional();
          }
          shape[key] = fieldSchema;
        }
        let o = z.object(shape);
        if (schema.description) o = o.describe(schema.description);
        return o;
      }
      return z.record(z.any());
    }

    return z.any();
  }
}
