import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async create(createUserDto: CreateUserDto, companyId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(createUserDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        name: createUserDto.name,
        role: createUserDto.role || 'VIEWER',
        companyId: companyId,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, companyId: string) {
    await this.findById(id, companyId); // verify exists in company

    const data: any = { ...updateUserDto };
    
    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(updateUserDto.password, salt);
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  async delete(id: string, companyId: string) {
    await this.findById(id, companyId);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
