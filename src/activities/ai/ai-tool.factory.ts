import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { DatabaseActivity } from '../database.activity';
import { SmsActivity } from '../sms.activity';
import { EmailActivity } from '../email.activity';
import { HttpActivity } from '../http.activity';

export class AiToolFactory {
  constructor(
    private readonly db: DatabaseActivity,
    private readonly sms: SmsActivity,
    private readonly mail: EmailActivity,
    private readonly http: HttpActivity,
  ) {}

  getTools(toolKeys: string[]): DynamicStructuredTool[] {
    const allTools: Record<string, DynamicStructuredTool> = {
      // 1. POSTGRES TOOL
      query_db_postgres: new DynamicStructuredTool({
        name: 'query_db_postgres',
        description:
          'Execute a SQL query in Postgres DB to fetch data about leads, users, or scores. Always limit results if unsure.',
        schema: z.object({
          query: z.string().describe('The SQL query to execute'),
        }),
        func: async ({ query }) => {
          try {
            const rows = await this.db.executeSqlQuery({ query });
            return JSON.stringify(rows);
          } catch (e) {
            return `Error executing SQL: ${e.message}`;
          }
        },
      }),

      // 2. TWILIO TOOL
      send_sms_twilio: new DynamicStructuredTool({
        name: 'send_sms_twilio',
        description:
          'Send an SMS text message to a specific phone number using Twilio.',
        schema: z.object({
          to: z.string().describe('The phone number (e.g., +1555...)'),
          message: z.string().describe('The content of the SMS'),
        }),
        func: async ({ to, message }) => {
          try {
            const res = await this.sms.sendSmsActivity({ to, body: message });
            return JSON.stringify(res);
          } catch (e) {
            return `Error sending SMS: ${e.message}`;
          }
        },
      }),

      // 3. SENDGRID TOOL
      send_email_sendgrid: new DynamicStructuredTool({
        name: 'send_email_sendgrid',
        description: 'Send an email to a user using Sendgrid.',
        schema: z.object({
          to: z.string().describe('The recipient email'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Email body content'),
        }),
        func: async ({ to, subject, body }) => {
          try {
            const res = await this.mail.sendEmail({ to, subject, body });
            return JSON.stringify(res);
          } catch (e) {
            return `Error sending email: ${e.message}`;
          }
        },
      }),

      // 4. HTTP TOOL
      make_http_call: new DynamicStructuredTool({
        name: 'make_http_call',
        description: 'Make a HTTP API call.',
        schema: z.object({
          method: z.enum(['GET', 'POST']),
          url: z.string(),
          body: z.any().optional(),
        }),
        func: async ({ method, url, body }) => {
          return JSON.stringify(
            await this.http.makeHttpRequest({ method, url, body }),
          );
        },
      }),
    };

    // Return only the tools enabled in the UI config
    return toolKeys
      .map((key) => allTools[key])
      .filter((t): t is DynamicStructuredTool => t !== undefined);
  }
}
