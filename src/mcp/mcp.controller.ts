import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Get('servers')
  // eslint-disable-next-line @typescript-eslint/require-await -- Langchain internal dynamic types / Third party library types
  async getInstalledServers() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Langchain internal dynamic types / Third party library types
    return this.mcpService.getInstalledServers();
  }

  @Post('servers')
  async installServer(@Body() installDto: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Langchain internal dynamic types / Third party library types
    return this.mcpService.installServer(installDto);
  }

  @Delete('servers/:id')
  // eslint-disable-next-line @typescript-eslint/require-await -- Langchain internal dynamic types / Third party library types
  async uninstallServer(@Param('id') id: string) {
    return this.mcpService.uninstallServer(id);
  }

  @Get('marketplace/:registry')
  async searchMarketplace(
    @Param('registry') registry: string,
    @Query('q') query: string,
  ) {
    return this.mcpService.searchMarketplace(registry, query || '');
  }
}
