import { prisma } from '../src/lib/prisma';

async function cleanup() {
  await prisma.mealEntry.deleteMany({
    where: { date: new Date('2026-11-08T12:00:00Z') },
  });
  await prisma.notice.deleteMany({
    where: { title: 'Monthly Bazar Schedule - Week 1' },
  });
  console.log('Test data cleaned up successfully.');
  await prisma.$disconnect();
}

cleanup();
