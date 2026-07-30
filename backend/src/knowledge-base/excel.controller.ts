import { Controller, Post } from '@nestjs/common';

@Controller('excel')
export class ExcelController {
  @Post('upload')
  upload() {
    return { message: 'Excel uploaded' };
  }
}
