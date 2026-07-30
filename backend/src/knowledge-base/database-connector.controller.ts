import { Controller, Post } from '@nestjs/common';

@Controller('database-connector')
export class DatabaseConnectorController {
  @Post('test')
  test() {
    return { message: 'Connection tested' };
  }
}
