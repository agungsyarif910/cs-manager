import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('broadcasts')
export class BroadcastProcessor {
  @Process()
  async handleBroadcast(job: Job) {
    console.log('Processing broadcast job', job.id);
  }
}
