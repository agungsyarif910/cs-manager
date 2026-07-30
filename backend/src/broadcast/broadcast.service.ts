import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class BroadcastService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('broadcasts') private broadcastQueue: Queue,
  ) {}

  async findAll(companyId: string) {
    return this.prisma.broadcast.findMany({ where: { companyId } });
  }
}
