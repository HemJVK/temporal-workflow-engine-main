import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import { TavilySearch } from '@langchain/tavily';

// 1. Define the State for the Subgraph
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

@Injectable()
export class LangGraphResearchActivity {
  private model: ChatOpenAI;
  private tools: any[];

  constructor(private configService: ConfigService) {
    this.model = new ChatOpenAI({
      model: 'gpt-4o',
      apiKey: this.configService.get('OPENAI_API_KEY'),
      temperature: 0,
    });

    // You need a TAVILY_API_KEY in .env, or replace with a custom search tool
    this.tools = [new TavilySearch({ maxResults: 2 })];
  }

  async runResearchSubgraph(args: { topic: string }) {
    console.log(`[LangGraph] Starting Research on: ${args.topic}`);

    // --- NODE 1: THE AGENT (Decides what to do) ---
    const agentNode = async (state: typeof AgentState.State) => {
      const modelWithTools = this.model.bindTools(this.tools);
      const response = await modelWithTools.invoke(state.messages);
      return { messages: [response] };
    };

    // --- NODE 2: THE TOOLS (Executes search) ---
    const toolNode = new ToolNode(this.tools);

    // --- EDGES: ROUTING LOGIC ---
    const shouldContinue = (state: typeof AgentState.State) => {
      const lastMessage = state.messages[state.messages.length - 1];

      // If the LLM made a tool call, go to 'tools' node
      if (
        'tool_calls' in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length > 0
      ) {
        return 'tools';
      }
      // Otherwise, we are done
      return END;
    };

    // --- BUILD THE GRAPH ---
    const workflow = new StateGraph(AgentState)
      .addNode('agent', agentNode)
      .addNode('tools', toolNode)

      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldContinue)
      .addEdge('tools', 'agent'); // Loop back to agent after tool execution

    // --- COMPILE & RUN ---
    const app = workflow.compile();

    const finalState = await app.invoke({
      messages: [
        new HumanMessage(`Research this topic thoroughly: ${args.topic}`),
      ],
    });

    // Extract the final response from the last message
    const lastMessage = finalState.messages[finalState.messages.length - 1];
    const content = lastMessage.content;

    console.log(
      `[LangGraph] Research Complete. Length: ${content.length} chars`,
    );
    console.log(`[LangGraph] Research Output: ${JSON.stringify(content)}`);

    return {
      topic: args.topic,
      summary: content,
      // We can even return the whole conversation history if needed
      // history: finalState.messages
    };
  }
}
