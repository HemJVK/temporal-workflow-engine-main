const configuration = () => ({
  // 1. App Config (Non-sensitive defaults)
  app: {
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3001,
    environment: process.env.NODE_ENV || 'development',
  },

  // 2. Temporal Config (Mixed)
  temporal: {
    address:
      process.env.TEMPORAL_ADDRESS ||
      `${process.env.TEMPORAL_HOST || 'localhost'}:${process.env.TEMPORAL_PORT || '7233'}`,
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'agentic-workflow-queue',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  },

  // 3. Database Config (Secrets)
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  // 4. API Keys (Secrets)
  ai: {
    openaiKey: process.env.OPENAI_API_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    defaultModel: 'nvidia/nemotron-3-super-120b-a12b:free',
  },

  // 5. Twilio Config (Secrets)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
    mock: process.env.MOCK_TWILIO === 'true',
  },
});
export default configuration;
