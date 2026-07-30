import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login to get access token' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  async refresh(@Body('refreshToken') _refreshToken: string, @CurrentUser() user: User) {
    return this.authService.refreshTokens(user);
  }

  @ApiOperation({ summary: 'Logout (client-side token removal)' })
  @Post('logout')
  async logout() {
    return { message: 'Logged out successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
