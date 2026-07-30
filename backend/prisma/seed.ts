import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: 'default-company' },
    update: {},
    create: {
      name: 'Default Company',
      slug: 'default-company',
      timezone: 'UTC',
    },
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash,
      name: 'Admin User',
      role: 'OWNER',
      companyId: company.id,
    },
  });

  console.log('Seed executed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
