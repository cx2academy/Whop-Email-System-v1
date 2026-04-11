import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import crypto from 'crypto';

export async function GET() {
  try {
    const campaigns = await db.emailCampaign.findMany({
      where: { sequenceId: null }
    });

    const sequenceMap = new Map<string, string>();
    let updatedCount = 0;

    for (const campaign of campaigns) {
      if (campaign.name.includes(' — Email ')) {
        const sequenceName = campaign.name.split(' — Email ')[0];
        
        if (!sequenceMap.has(sequenceName)) {
          sequenceMap.set(sequenceName, crypto.randomUUID());
        }

        const sequenceId = sequenceMap.get(sequenceName);

        await db.emailCampaign.update({
          where: { id: campaign.id },
          data: { sequenceId }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
