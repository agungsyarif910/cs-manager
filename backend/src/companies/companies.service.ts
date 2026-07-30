import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany();
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async create(createCompanyDto: CreateCompanyDto) {
    const existing = await this.prisma.company.findUnique({
      where: { slug: createCompanyDto.slug },
    });
    if (existing) {
      throw new ConflictException('Company slug already exists');
    }

    return this.prisma.company.create({
      data: createCompanyDto,
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    await this.findById(id);

    if (updateCompanyDto.slug) {
      const existing = await this.prisma.company.findFirst({
        where: { slug: updateCompanyDto.slug, NOT: { id } },
      });
      if (existing) throw new ConflictException('Company slug already exists');
    }

    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.company.delete({ where: { id } });
    return { success: true };
  }
}
