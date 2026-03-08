import { TwilioVoiceResponseModel } from './twilio-voice-response.model';

export interface SqlQueryArgs {
  query: string;
  params?: unknown[];
}

export interface SmsArgs {
  to: string;
  body: string;
}

export interface EmailArgs {
  to: string;
  subject: string;
  body: string;
}

export interface HttpArgs {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

// Activity Interface
export interface AgentActivities {
  executeSqlQuery(args: SqlQueryArgs): Promise<any>;
  sendEmail(args: EmailArgs): Promise<any>;
  sendSmsActivity(args: SmsArgs): Promise<any>;
  makeHttpRequest(args: HttpArgs): Promise<any>;
  runSentimentAnalysis(args: { query: string }): Promise<{ sentiment: string }>;
  logStep(args: any): Promise<void>;
  runAgent(args: {
    systemPrompt: string;
    userPrompt: string;
    modelName?: string;
    boundTools: string[];
    mcpServers?: any[];
    maxRetries?: number; // For API errors (Default: 3)
    maxIterations?: number; // For Agent loops (Default: 5)
    outputFields?: {
      name: string;
      description: string;
      type: 'string' | 'number' | 'boolean';
    }[];
  }): Promise<any>;
  runResearchSubgraph(args: { topic: string }): Promise<{ summary: string }>;
  updateRunStatus(args: {
    runId: string;
    status: 'COMPLETED' | 'FAILED';
    output?: any;
    error?: string;
  }): Promise<void>;
  makeNotificationCall(args: {
    to: string;
    message: string;
  }): Promise<TwilioVoiceResponseModel>;
  makeConversationalCallTwilio(args: {
    to: string;
    systemPrompt: string;
    callbackUrl: string; // Your NestJS URL
    metadata: { workflowId: string; runId: string; nodeId: string };
  }): Promise<TwilioVoiceResponseModel>;
}
