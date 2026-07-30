import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'messages' },
      { name: 'indexing' }
    ),
  ],
})
export class QueueModule {}
