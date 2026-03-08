import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

// Need whatever entity stores the MCP server configs.
// Assuming an McpServer entity or just storing them in memory or a simple JSON file for now,
// but based on prior context, there is a database. I'll scaffold a basic service that fetches from Awesome MCP.

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);

  // Temporary in-memory store if no DB entity exists for MCP servers yet
  private installedServers: any[] = [];

  onModuleInit() {
    this.logger.log('Initializing MCP Service (seeding default servers)...');

    const defaults = [
      {
        id: 'filesystem',
        name: 'Filesystem',
        transportType: 'stdio',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/'],
        },
      },
      {
        id: 'sqlite',
        name: 'SQLite',
        transportType: 'stdio',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sqlite', 'test.db'],
        },
      },
      {
        id: 'github',
        name: 'GitHub',
        transportType: 'stdio',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
        },
      },
      {
        id: 'brave-search',
        name: 'Brave Search',
        transportType: 'stdio',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-brave-search'],
        },
      },
      {
        id: 'memory',
        name: 'Memory',
        transportType: 'stdio',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory'],
        },
      },
      {
        id: 'sequential-thinking',
        name: 'Sequential Thinking',
        transportType: 'stdio',
        config: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
        },
      },
    ];

    this.installedServers = [...defaults];
  }

  getInstalledServers() {
    return this.installedServers;
  }

  async installServer(serverDto: Record<string, unknown>) {
    const name = String(serverDto.name);
    const transportType =
      typeof serverDto.transportType === 'string'
        ? serverDto.transportType
        : 'stdio';
    const newServer = {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      transportType,
      config: serverDto.config as Record<string, unknown>,
    };

    // Check if exists
    if (!this.installedServers.find((s) => s.id === newServer.id)) {
      this.installedServers.push(newServer);
    }

    return newServer;
  }

  uninstallServer(id: string) {
    this.installedServers = this.installedServers.filter((s) => s.id !== id);
    return { success: true };
  }

  async searchMarketplace(registry: string, query: string) {
    try {
      if (registry === 'smithery') {
        const res = await fetch(
          `https://api.smithery.ai/v1/registry?q=${encodeURIComponent(query)}`,
        );
        const data = (await res.json()) as {
          packages?: { name: string; description: string }[];
        };
        // Map Smithery response to common format
        return data.packages
          ? data.packages.map((pkg) => ({
              id: pkg.name,
              name: pkg.name,
              description: pkg.description,
              package: pkg.name,
            }))
          : [];
      } else if (registry === 'glama') {
        // Fallback for Glama
        return [];
      }
    } catch (e) {
      this.logger.error(`Failed to fetch marketplace ${registry}`, e);
    }
    return [];
  }
}
