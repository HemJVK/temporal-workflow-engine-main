import { IWorkflowTool } from './tool.interface';
import { PostgresTool } from './postgres.tool';
import { HttpTool } from './http.tool';
import { SentimentAnalysisTool } from './sentiment.analysis.tool';
import { GenericLlmTool } from './generic-llm.tool';
import { ResearcherTool } from './researcher.tool';
import { NodeType } from 'src/entity/workflow.types';

const registry: Partial<Record<NodeType, IWorkflowTool>> = {
  query_db_postgres: new PostgresTool(),
  make_http_call: new HttpTool(),
  tool_sentiment_analysis: new SentimentAnalysisTool(),
  tool_generic_llm: new GenericLlmTool(),
  agent_researcher: new ResearcherTool(),
};

export class ToolRegistry {
  static getTool(type: NodeType): IWorkflowTool | undefined {
    return registry[type];
  }
}
