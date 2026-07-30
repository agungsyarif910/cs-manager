import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.template.findMany({ where: { companyId } });
  }

  parseTemplate(content: string, variables: Record<string, string>): string {
    let parsed = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      parsed = parsed.replace(regex, value);
    }
    return parsed;
  }
}
