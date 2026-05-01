import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as vm from 'vm';

@Injectable()
export class LogicActivity {
  constructor(private readonly dataSource: DataSource) {}

  async runCustomLogic(args: { script: string; inputs: Record<string, any> }) {
    console.log(`[Logic Activity] Executing custom logic...`);
    try {
      const sandbox = { input: args.inputs || {}, result: null };
      vm.createContext(sandbox);

      // Wrap the script in a function to allow returning values easily
      const code = `
        (function() {
          ${args.script}
        })();
      `;

      const res = vm.runInContext(code, sandbox, { timeout: 2000 });
      return res;
    } catch (error: any) {
      console.error('[Logic Activity] Custom logic failed:', error);
      throw new Error(`Custom Logic Error: ${error.message}`);
    }
  }

  async fetchPackagePayload(args: { workflowId: string }) {
    console.log(
      `[Logic Activity] Fetching package payload for: ${args.workflowId}`,
    );
    try {
      // Find the deployedGraph from workflow_definitions
      const rows = await this.dataSource.query(
        `SELECT "deployedGraph", "isPackage" FROM workflow_definitions WHERE "workflowId" = $1`,
        [args.workflowId],
      );

      if (!rows || rows.length === 0) {
        throw new Error(`Package ${args.workflowId} not found`);
      }

      if (!rows[0].isPackage) {
        throw new Error(
          `Workflow ${args.workflowId} is not published as a Package`,
        );
      }

      if (!rows[0].deployedGraph) {
        throw new Error(
          `Package ${args.workflowId} is not deployed/published yet`,
        );
      }

      return rows[0].deployedGraph;
    } catch (error: any) {
      console.error('[Logic Activity] Fetch package failed:', error);
      throw new Error(`Fetch Package Error: ${error.message}`);
    }
  }
}
