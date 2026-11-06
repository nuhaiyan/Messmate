import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function updateAdminPassword() {
  const hash = await bcrypt.hash('1514888683', 10);
  const tarek = await prisma.messMember.findFirst({
    where: { isPrimaryAdmin: true },
    include: { user: true },
  });

  if (!tarek) {
    console.error('Mohammad Tarek Hossen not found in database.');
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: tarek.userId },
    data: { passwordHash: hash },
  });

  console.log(`Successfully set Admin Password for ${tarek.fullName} to 1514888683`);
  await prisma.$disconnect();
}

updateAdminPassword().catch((err) => {
  console.error(err);
  process.exit(1);
});
