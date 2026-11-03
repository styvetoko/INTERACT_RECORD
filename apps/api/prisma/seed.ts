import { PrismaClient } from '@prisma/client';
import { seedDisciplines } from '../src/disciplines/seed-data';

const prisma = new PrismaClient();

seedDisciplines(prisma)
  .then(() => console.log('Disciplines et catégories créées.'))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
