export class LLMConfig {
  modelName: string; // e.g. 'gpt-4o'
  modelProvider?: string; // e.g. 'openai', 'anthropic'
  systemPrompt: string; // e.g. 'You are a helpful assistant...'
  userPrompt: string; // e.g. 'Check DB for email X'
  tools: string[]; // e.g. ['query_db_postgres', 'send_sms_twilio']
  temperature?: number;
}
