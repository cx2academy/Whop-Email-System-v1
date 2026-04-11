import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.emailCampaign.findMany({
    select: { id: true, name: true, sequenceId: true },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(campaigns, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
