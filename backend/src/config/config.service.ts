import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('port')!;
  }

  get jwtSecret(): string {
    return this.configService.get<string>('jwt.secret')!;
  }

  get jwtExpiration(): string {
    return this.configService.get<string>('jwt.expiration')!;
  }

  get jwtRefreshSecret(): string {
    return this.configService.get<string>('jwt.refreshSecret')!;
  }

  get jwtRefreshExpiration(): string {
    return this.configService.get<string>('jwt.refreshExpiration')!;
  }

  get encryptionKey(): string {
    return this.configService.get<string>('encryption.key')!;
  }
}
