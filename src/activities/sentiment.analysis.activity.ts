import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { z } from 'zod';

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

  constructor(private readonly configService: ConfigService) {
    this.model = new ChatOpenAI({
      model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
      apiKey: this.configService.get('OPENROUTER_API_KEY'),
      maxTokens: 256, // sentiment only needs a very short output
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

    // --- NODE 2: MESSAGE SENDER ---
    const smsNode = async (state: typeof GraphState.State) => {
      console.log(`--- Mock Sending SMS (${state.sentiment}) ---`);

      console.log(
        `Analysis Result: Your query is ${state.sentiment}. (SMS sent to ${state.phoneNumber})`,
      );

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

    try {
      await app.invoke({
        query: args.query,
        phoneNumber: args.phoneNumber,
      });
    } catch (e) {
      console.log('Error invoking sentiment graph', e);
    }

    return { success: true, finalSentiment: 'PROCESSED' };
  }
}
