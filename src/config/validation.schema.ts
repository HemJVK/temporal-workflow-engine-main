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

  // AI
  OPENAI_API_KEY: Joi.string().required(), // Essential for your AI nodes

  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_FROM_NUMBER: Joi.string().required(),

  SENDGRID_API_KEY: Joi.string().required(),
  SENDGRID_FROM_EMAIL: Joi.string().email().required(),
});
