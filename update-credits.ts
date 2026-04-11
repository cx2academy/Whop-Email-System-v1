import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.workspace.updateMany({
    data: { aiCredits: 1000 }
  });
  console.log('Updated credits to 1000 for all workspaces');
}
main().catch(console.error).finally(() => prisma.$disconnect());
