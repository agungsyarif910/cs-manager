import { Controller, Get, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all settings' })
  async getAll(@Request() req: any) {
    return this.settingsService.getAll(req.user.companyId);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting' })
  async get(@Request() req: any, @Param('key') key: string) {
    return this.settingsService.get(req.user.companyId, key);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Create or update a setting' })
  async set(
    @Request() req: any, 
    @Param('key') key: string, 
    @Body() data: { value: any }
  ) {
    return this.settingsService.set(req.user.companyId, key, data.value);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a setting' })
  async delete(@Request() req: any, @Param('key') key: string) {
    return this.settingsService.delete(req.user.companyId, key);
  }
}
