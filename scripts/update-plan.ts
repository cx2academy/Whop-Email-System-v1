import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.workspace.updateMany({
    data: { 
      plan: 'SCALE',
      aiCredits: 1000000 
    }
  });
  console.log('Updated all workspaces to SCALE plan with 1000000 AI credits');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
