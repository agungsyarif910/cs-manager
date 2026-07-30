import { Module } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { BullModule } from '@nestjs/bull';
import { BroadcastProcessor } from './broadcast.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'broadcasts',
    }),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastProcessor],
  exports: [BroadcastService],
})
export class BroadcastModule {}
