import { Injectable } from '@nestjs/common';

@Injectable()
export class DatabaseConnectorService {
  testConnection() {
    return true;
  }
}
