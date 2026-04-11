import type { Metadata } from 'next';
import { requireAdminAccess } from '@/lib/auth/session';
import { getTags } from '@/lib/sync/actions';
import { getSegmentsForCampaign } from '@/lib/segmentation/actions';
import { VariantBuilder } from './variant-builder';

export const metadata: Metadata = { title: 'Create Variants' };

export default async function VariantsPage() {
  await requireAdminAccess();
  
  const [tags, segments] = await Promise.all([
    getTags(),
    getSegmentsForCampaign(),
  ]);

  return (
    <VariantBuilder tags={tags} segments={segments} />
  );
}
