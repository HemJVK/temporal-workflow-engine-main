import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { DatabaseActivity } from '../database.activity';
import { HttpActivity } from '../http.activity';

export class AiToolFactory {
  constructor(
    private readonly db: DatabaseActivity,
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

      // 2. HTTP TOOL
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

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailAppPassword) {
      allTools['send_email_gmail'] = new DynamicStructuredTool({
        name: 'send_email_gmail',
        description: 'Send an email to a target address using Gmail.',
        schema: z.object({
          to: z.string().describe('The recipient email address'),
          subject: z.string().describe('The subject of the email'),
          body: z.string().describe('The body of the email'),
        }),
        func: async ({ to, subject, body }) => {
          try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: gmailUser,
                pass: gmailAppPassword,
              },
            });
            const info = await transporter.sendMail({
              from: gmailUser,
              to,
              subject,
              text: body,
            });
            return `Email sent successfully! Message ID: ${info.messageId}`;
          } catch (e: any) {
            return `Failed to send email: ${e.message}`;
          }
        },
      });
    }

    const serperApiKey = process.env.SERPER_API_KEY;

    if (serperApiKey) {
      allTools['google_search_serper'] = new DynamicStructuredTool({
        name: 'google_search_serper',
        description: 'A low-cost Google Search API. Useful for when you need to answer questions about current events. Input should be a search query.',
        schema: z.object({
          query: z.string().describe('The search query'),
        }),
        func: async ({ query }) => {
          try {
            const response = await fetch('https://google.serper.dev/search', {
              method: 'POST',
              headers: {
                'X-API-KEY': serperApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ q: query })
            });
            const data = await response.json();
            
            if (data.organic && data.organic.length > 0) {
              return JSON.stringify(data.organic.map((result: any) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet
              })));
            } else if (data.answerBox) {
              return JSON.stringify(data.answerBox);
            } else {
              return "No good search result found";
            }
          } catch (e: any) {
            return `Error executing search: ${e.message}`;
          }
        },
      });
    }

    // Return only the tools enabled in the UI config
    return toolKeys
      .map((key) => allTools[key])
      .filter((t): t is DynamicStructuredTool => t !== undefined);
  }
}
