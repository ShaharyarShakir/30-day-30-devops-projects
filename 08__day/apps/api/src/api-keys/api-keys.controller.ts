import { Controller, Post, Get, Delete, Body, Param, Headers } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async createKey(
    @Headers('x-organization-id') orgId: string,
    @Body('name') name: string,
    @Body('scopes') scopes: string[],
    @Body('expiresDays') expiresDays?: number,
  ) {
    return this.apiKeysService.createKey(orgId, name, scopes, expiresDays);
  }

  @Get()
  async getKeys(@Headers('x-organization-id') orgId: string) {
    return this.apiKeysService.getKeys(orgId);
  }

  @Delete(':id')
  async revokeKey(
    @Headers('x-organization-id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeysService.revokeKey(id, orgId);
  }
}
