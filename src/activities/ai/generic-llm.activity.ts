import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AgentExecutor,
  createToolCallingAgent,
} from '@langchain/classic/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import { DatabaseActivity } from '../database.activity';
import { SmsActivity } from '../sms.activity';
import { HttpActivity } from '../http.activity';
import { AiToolFactory } from './ai-tool.factory';
import { EmailActivity } from '../email.activity';

@Injectable()
export class GenericLlmActivity {
  private readonly toolFactory: AiToolFactory;

  constructor(
    private readonly configService: ConfigService,
    private readonly db: DatabaseActivity,
    private readonly sms: SmsActivity,
    private readonly mail: EmailActivity,
    private readonly http: HttpActivity,
  ) {
    this.toolFactory = new AiToolFactory(db, sms, mail, http);
  }

  async runLlm(args: {
    systemPrompt: string;
    userPrompt: string;
    modelName?: string;
    boundTools: string[];
    maxRetries: number;
    maxIterations: number;
    outputFields?: {
      name: string;
      description: string;
      type: 'string' | 'number' | 'boolean';
    }[];
  }) {
    console.log(`[Generic LLM] Running with args: ${JSON.stringify(args)}`);
    const googleModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

    if (!args.modelName) {
      args.modelName = 'gpt-4o';
    }

    // 1. Dynamic Model Selection
    let llm: BaseChatModel = new ChatOpenAI({
      model: args.modelName,
      apiKey: this.configService.get('OPENAI_API_KEY'),
      temperature: 1,
      maxRetries: args.maxRetries ?? 3,
    });

    if (googleModels.includes(args.modelName)) {
      llm = new ChatGoogleGenerativeAI({
        model: args.modelName,
        apiKey: this.configService.get('GOOGLE_GEMINI_API_KEY'),
        temperature: 1,
        maxRetries: args.maxRetries ?? 3,
      });
    }

    // 2. CASE A: STRUCTURED OUTPUT (JSON)
    if (args.outputFields && args.outputFields.length > 0) {
      console.log(
        `[Generic LLM] Mode: Structured Output (${args.outputFields.length} fields)`,
      );

      // Dynamically build Zod Schema from UI definition
      const shape: Record<string, any> = {};

      args.outputFields.forEach((field) => {
        let validator: any = z.string();
        if (field.type === 'number') validator = z.number();
        if (field.type === 'boolean') validator = z.boolean();

        shape[field.name] = validator.describe(field.description);
      });

      const schema = z.object(shape);
      const structuredLlm = llm.withStructuredOutput(schema);

      const response = await structuredLlm.invoke([
        { role: 'system', content: args.systemPrompt },
        { role: 'user', content: args.userPrompt },
      ]);
      console.log(
        `[Generic LLM] Structured Response: ${JSON.stringify(response)}`,
      );
      return response; // Returns JSON object: { category: "HOT", confidence: 0.9 }
    }

    if (args.boundTools && args.boundTools.length > 0) {
      console.log(
        `[Generic LLM] Agent Mode. Tools: ${args.boundTools.join(', ')}`,
      );

      const tools = this.toolFactory.getTools(args.boundTools);

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', args.systemPrompt],
        ['user', '{input}'],
        ['placeholder', '{agent_scratchpad}'], // Critical for agent scratchpad
      ]);

      const agent = await createToolCallingAgent({ llm, tools, prompt });
      const executor = new AgentExecutor({
        agent,
        tools,
        maxIterations: args.maxIterations ?? 2,
        // verbose: true,
        returnIntermediateSteps: true,
      });

      const result = await executor.invoke({ input: args.userPrompt });

      // console.log(
      //   '[Generic LLM] Agent Steps:',
      //   JSON.stringify(result.intermediateSteps, null, 2),
      // );

      // AgentExecutor returns { output: "final answer" }
      // We try to parse it if structured fields were requested, else return text
      return this.handleOutputParsing(result.output, args.outputFields);
    }

    // 3. CASE B: FREE TEXT (Chat)
    else {
      console.log(`[Generic LLM] Mode: Free Text`);
      const response = await llm.invoke([
        { role: 'system', content: args.systemPrompt },
        { role: 'user', content: args.userPrompt },
      ]);

      // Return a standard object so subsequent nodes can access {{node.text}}
      console.log(`[Generic LLM] Response: ${response.content}`);
      return { text: response.content };
    }
  }
  private handleOutputParsing(text: string, outputFields?: any[]) {
    if (!outputFields || outputFields.length === 0) {
      return { text };
    }
    // If user wanted JSON but we used an Agent, the Agent usually returns text.
    // You might need a second pass or assume the Agent output valid JSON.
    try {
      return JSON.parse(text);
    } catch {
      return { text };
    }
  }
}
