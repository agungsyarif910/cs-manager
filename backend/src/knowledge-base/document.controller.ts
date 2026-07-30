import { Controller, Post } from '@nestjs/common';

@Controller('documents')
export class DocumentController {
  @Post('upload')
  upload() {
    return { message: 'Document uploaded' };
  }
}
