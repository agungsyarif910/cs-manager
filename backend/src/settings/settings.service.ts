import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(companyId: string, key: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { companyId, key }
    });
    return setting ? setting.value : null;
  }

  async set(companyId: string, key: string, value: any) {
    return this.prisma.setting.upsert({
      where: {
        companyId_key: { companyId, key }
      },
      update: { value },
      create: { companyId, key, value }
    });
  }

  async getAll(companyId: string) {
    return this.prisma.setting.findMany({
      where: { companyId }
    });
  }

  async delete(companyId: string, key: string) {
    const setting = await this.prisma.setting.findFirst({
      where: { companyId, key }
    });
    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }
    return this.prisma.setting.delete({
      where: {
        companyId_key: { companyId, key }
      }
    });
  }
}
