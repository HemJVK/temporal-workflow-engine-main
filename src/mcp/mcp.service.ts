import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);

  constructor(private readonly configService: ConfigService) {}

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
        const glamaKey = this.configService.get<string>('GLAMA_API_KEY');
        const glamaUrl = `https://glama.ai/api/mcp/v1/servers?q=${encodeURIComponent(query)}`;
        const glamaRes = await fetch(glamaUrl, {
          headers: glamaKey ? { Authorization: `Bearer ${glamaKey}` } : {},
        });
        if (!glamaRes.ok) {
          this.logger.error(`Glama API returned ${glamaRes.status}`);
          return [];
        }
        const glamaData = (await glamaRes.json()) as any;
        // Glama returns { servers: [...] } or { data: [...] }
        const list: any[] = glamaData.servers || glamaData.data || glamaData || [];
        return list.map((s: any) => ({
          id: s.id || s.slug || s.name,
          name: s.name || s.id,
          description: s.description || '',
          package: s.package || s.npmPackage || '',
        }));
      }
    } catch (e) {
      this.logger.error(`Failed to fetch marketplace ${registry}`, e);
    }
    return [];
  }
}
