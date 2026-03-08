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
  async getInstalledServers() {
    return this.mcpService.getInstalledServers();
  }

  @Post('servers')
  async installServer(@Body() installDto: any) {
    return this.mcpService.installServer(installDto);
  }

  @Delete('servers/:id')
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
