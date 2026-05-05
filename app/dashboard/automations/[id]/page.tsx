import { getAutomation } from '@/lib/automations/actions';
import { notFound } from 'next/navigation';
import AutomationBuilder from './automation-builder';

export const metadata = {
  title: 'Automation Builder | RevTray',
};

export default async function AutomationBuilderPage({ params }: { params: { id: string } }) {
  const automation = await getAutomation(params.id);

  if (!automation) {
    notFound();
  }

  return (
    <div className="h-full flex flex-col">
      <AutomationBuilder automation={automation} />
    </div>
  );
}
