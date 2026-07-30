import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List all contacts' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'label', required: false })
  @ApiQuery({ name: 'tag', required: false })
  async findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('label') label?: string,
    @Query('tag') tag?: string,
  ) {
    return this.contactsService.findAll(req.user.companyId, { page, limit, search, status, label, tag });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  async findById(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.findById(req.user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  async create(@Request() req: any, @Body() data: any) {
    return this.contactsService.create(req.user.companyId, data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  async update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.contactsService.update(req.user.companyId, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.contactsService.delete(req.user.companyId, id);
  }
}
