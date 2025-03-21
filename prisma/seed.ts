import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const apiKey = randomBytes(32).toString('hex'); // Generate a random API key
  await prisma.apiKey.create({
    data: {
      apiKey,
      owner: 'My Application',
    },
  });
  console.log(`Generated API Key: ${apiKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

//npx ts-node prisma/seed.ts - modify and run this file to update the database and get the api key.