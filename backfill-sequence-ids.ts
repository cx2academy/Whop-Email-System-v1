import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { sequenceId: null }
  });

  const sequenceMap = new Map<string, string>();

  for (const campaign of campaigns) {
    if (campaign.name.includes(' — Email ')) {
      const sequenceName = campaign.name.split(' — Email ')[0];
      
      if (!sequenceMap.has(sequenceName)) {
        sequenceMap.set(sequenceName, crypto.randomUUID());
      }

      const sequenceId = sequenceMap.get(sequenceName);

      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { sequenceId }
      });
      console.log(`Updated campaign ${campaign.id} with sequenceId ${sequenceId}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
