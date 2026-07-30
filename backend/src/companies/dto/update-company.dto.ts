import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @IsString()
  @IsOptional()
  logo?: string;

  @IsOptional()
  settings?: any;

  @IsOptional()
  workingHours?: any;

  @IsOptional()
  holidays?: any;
}
