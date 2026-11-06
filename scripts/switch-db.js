const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2];

if (target !== 'sqlite' && target !== 'postgres') {
  console.error('Usage: node scripts/switch-db.js [sqlite|postgres]');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const prismaDir = path.join(rootDir, 'prisma');
const targetSchema = target === 'sqlite' 
  ? path.join(prismaDir, 'schema.sqlite.prisma') 
  : path.join(prismaDir, 'schema.postgresql.prisma');

const destSchema = path.join(prismaDir, 'schema.prisma');

fs.copyFileSync(targetSchema, destSchema);
console.log(`Switched prisma/schema.prisma to ${target.toUpperCase()} mode.`);

try {
  console.log('Regenerating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: rootDir });
  console.log(`Prisma client regenerated for ${target.toUpperCase()}.`);
} catch (err) {
  console.error('Failed to run prisma generate:', err.message);
}
