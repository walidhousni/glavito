import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { UnifiedInbox } from '@/components/conversations/unified-inbox';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  
  return {
    title: `${t('navigation.conversations')} - Glavito`,
    description: 'Advanced multi-channel conversation management with AI-powered insights',
  };
}

export default function ConversationsPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <UnifiedInbox />
    </div>
  );
}