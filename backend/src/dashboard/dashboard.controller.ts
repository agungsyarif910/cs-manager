import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.companyId);
  }

  @Get('charts/daily')
  @ApiOperation({ summary: 'Get daily message chart data' })
  async getDailyChart(@Request() req: any) {
    return this.dashboardService.getDailyChart(req.user.companyId);
  }

  @Get('charts/monthly')
  @ApiOperation({ summary: 'Get monthly message chart data' })
  async getMonthlyChart(@Request() req: any) {
    return this.dashboardService.getMonthlyChart(req.user.companyId);
  }
}
