import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StdioClientTransport,
  StdioServerParameters,
} from '@modelcontextprotocol/sdk/client/stdio.js';

export interface McpServerConfig {
  id: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

@Injectable()
export class McpClientService {
  private clients = new Map<string, Client>();
  private readonly logger = new Logger(McpClientService.name);

  async getClient(config: McpServerConfig): Promise<Client> {
    const serverId = config.id;
    if (this.clients.has(serverId)) {
      return this.clients.get(serverId)!;
    }

    this.logger.log(`Connecting to new MCP Server: ${serverId}`);

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries({
      ...process.env,
      ...(config.env || {}),
    })) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    const transportParams: StdioServerParameters = {
      command: config.command,
      args: config.args || [],
      env,
    };

    const transport = new StdioClientTransport(transportParams);

    const client = new Client(
      { name: 'temporal-agent', version: '1.0.0' },
      { capabilities: {} },
    );

    await client.connect(transport);
    this.clients.set(serverId, client);

    // Watch for disconnects
    transport.onclose = () => {
      this.clients.delete(serverId);
    };

    return client;
  }

  async disconnectAll() {
    for (const [id, client] of this.clients.entries()) {
      try {
        await client.close();
      } catch (e) {
        // ignore
      }
    }
    this.clients.clear();
  }
}
