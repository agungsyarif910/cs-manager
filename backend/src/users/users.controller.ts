import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentCompany } from '../common/decorators/company.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.OWNER, Role.SUPERVISOR)
  @Post()
  create(@Body() createUserDto: CreateUserDto, @CurrentCompany() companyId: string) {
    return this.usersService.create(createUserDto, companyId);
  }

  @Get()
  findAll(@CurrentCompany() companyId: string) {
    return this.usersService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentCompany() companyId: string) {
    return this.usersService.findById(id, companyId);
  }

  @Roles(Role.OWNER, Role.SUPERVISOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @CurrentCompany() companyId: string) {
    return this.usersService.update(id, updateUserDto, companyId);
  }

  @Roles(Role.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentCompany() companyId: string) {
    return this.usersService.delete(id, companyId);
  }
}
