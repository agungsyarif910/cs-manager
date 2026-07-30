import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class WebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  object!: string;

  @IsObject()
  @IsNotEmpty()
  entry!: any;
}
