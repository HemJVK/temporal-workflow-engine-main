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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
            const rows = await this.db.executeSqlQuery({ query });
            return JSON.stringify(rows);
          } catch (e) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Langchain internal dynamic types / Third party library types
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
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
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
