import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseActivity {
  constructor(private readonly dataSource: DataSource) {}

  async executeSqlQuery(args: { query: string; params?: any[] }) {
    try {
      console.log(`[DB Activity] Executing: ${args.query}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const rows = await this.dataSource.query(args.query, args.params);

      if (Array.isArray(rows)) {
        console.log(
          `[DB Activity] Query executed successfully. Rows returned: ${rows.length}`,
        );
        for (const row of rows) {
          console.log('[DB Activity] Row:', row);
        }
      } else {
        console.log('[DB Activity] Rows:', rows);
      }

      return rows;
    } catch (error) {
      console.error('Error executing SQL query:', error);
      return {
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        error: error.message,
      };
    }
  }
}
