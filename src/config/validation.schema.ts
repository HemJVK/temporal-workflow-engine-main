import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Temporal
  TEMPORAL_TASK_QUEUE: Joi.string().required(), // Mandatory!

  // Database (Fail if these are missing)
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // AI Providers (Optional, user provides at least one)
  OPENAI_API_KEY: Joi.string().optional(),
  ANTHROPIC_API_KEY: Joi.string().optional(),
  GOOGLE_GEMINI_API_KEY: Joi.string().optional(),
  GROQ_API_KEY: Joi.string().optional(),
  OPENROUTER_API_KEY: Joi.string().optional(),
});
