import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private conversationService: ConversationService) {}

  @Get()
  @ApiOperation({ summary: 'List all conversations' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'handlerType', required: false })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('handlerType') handlerType?: string,
    @Query('agentId') agentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.conversationService.findAll(req.user.companyId, {
      page, limit, status, handlerType, agentId, startDate, endDate, search
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  async findById(@Request() req: any, @Param('id') id: string) {
    return this.conversationService.findById(req.user.companyId, id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign conversation to human agent' })
  async assignToUser(@Request() req: any, @Param('id') id: string, @Body('userId') userId: string) {
    return this.conversationService.assignToUser(req.user.companyId, id, userId);
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Release conversation back to AI' })
  async releaseToAi(@Request() req: any, @Param('id') id: string) {
    return this.conversationService.releaseToAi(req.user.companyId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close conversation' })
  async close(@Request() req: any, @Param('id') id: string) {
    return this.conversationService.updateStatus(req.user.companyId, id, 'CLOSED');
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMessages(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.conversationService.getMessages(req.user.companyId, id, page, limit);
  }
}
