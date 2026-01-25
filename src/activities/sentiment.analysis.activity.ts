import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { z } from 'zod';
import { SmsActivity } from './sms.activity';

// Import your existing SMS service to reuse logic

// 1. Define the Graph State
// This is the data that moves between nodes
const GraphState = Annotation.Root({
  query: Annotation<string>(),
  phoneNumber: Annotation<string>(),
  sentiment: Annotation<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>(),
});

@Injectable()
export class SentimentActivity {
  private readonly model: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly smsService: SmsActivity, // Reuse your existing Twilio logic
  ) {
    this.model = new ChatOpenAI({
      model: 'gpt-4o',
      apiKey: this.configService.get('OPENAI_API_KEY'),
      temperature: 0,
    });
  }

  async runSentimentWorkflow(args: { query: string; phoneNumber: string }) {
    console.log(`[LangGraph] Starting Sentiment Flow for: "${args.query}"`);

    // --- NODE 1: SENTIMENT ANALYZER ---
    const analyzerNode = async (state: typeof GraphState.State) => {
      console.log('--- Analysing Sentiment ---');

      // Define structure for LLM output
      const schema = z.object({
        sentiment: z
          .enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE'])
          .describe('The sentiment of the text'),
      });

      // Bind schema to model (Structured Output)
      const structuredLlm = this.model.withStructuredOutput(schema);

      const response = await structuredLlm.invoke(
        `Analyze the sentiment of this text: "${state.query}"`,
      );

      return { sentiment: response.sentiment };
    };

    // --- NODE 2: SMS SENDER ---
    const smsNode = async (state: typeof GraphState.State) => {
      console.log(`--- Sending SMS (${state.sentiment}) ---`);

      const message = `Analysis Result: Your query is ${state.sentiment}.`;

      // Use your existing SMS Activity logic
      await this.smsService.sendSmsActivity({
        to: state.phoneNumber,
        body: message,
      });

      // We don't need to return anything new to state, just side effect
      return {};
    };

    // --- BUILD THE GRAPH ---
    const workflow = new StateGraph(GraphState)
      .addNode('analyzer', analyzerNode)
      .addNode('sender', smsNode)

      // Start at Analyzer
      .addEdge(START, 'analyzer')

      // Conditional Logic (The Routing)
      .addConditionalEdges('analyzer', (state) => {
        // Return the *Node Name* to go to, or END
        if (state.sentiment === 'NEGATIVE') {
          console.log('--- Negative Sentiment: Stopping ---');
          return END; // Do nothing
        }
        return 'sender'; // Positive or Neutral -> Send SMS
      })

      // After sending SMS, we are done
      .addEdge('sender', END);

    // --- COMPILE & RUN ---
    const app = workflow.compile();

    await app.invoke({
      query: args.query,
      phoneNumber: args.phoneNumber,
    });

    return { success: true, finalSentiment: 'PROCESSED' };
  }
}
