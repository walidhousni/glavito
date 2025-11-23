import type { HomepagePayload } from './types';

export interface CmsConfig {
  provider: 'sanity';
  projectId: string;
  dataset: string;
  apiVersion: string;
  useCdn: boolean;
  readToken?: string;
}

export function getCmsConfig(): CmsConfig | null {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET;
  if (!projectId || !dataset) {
    return null;
  }
  return {
    provider: 'sanity',
    projectId,
    dataset,
    apiVersion: process.env.SANITY_API_VERSION || '2023-05-03',
    useCdn: process.env.SANITY_USE_CDN !== 'false',
    readToken: process.env.SANITY_READ_TOKEN,
  };
}

/**
 * Very small helper to build a GROQ query URL.
 * We keep it here so we can later swap to @sanity/client if needed.
 */
export function buildSanityQueryUrl(config: CmsConfig, query: string, params: Record<string, unknown> = {}): string {
  const encodedParams = encodeURIComponent(JSON.stringify(params));
  return `https://${config.projectId}.api.sanity.io/${config.apiVersion}/data/query/${config.dataset}?query=${encodeURIComponent(
    query,
  )}&%24params=${encodedParams}`;
}

/**
 * Temporary mocked homepage content, used when CMS config is missing.
 * This lets us wire the rest of the system without requiring Sanity to be live yet.
 */
export function getMockHomepagePayload(locale: string): HomepagePayload {
  return {
    siteSettings: {
      siteTitle: 'Glavito',
      tagline: 'AI-first omnichannel support platform',
      logoUrl: undefined,
      primaryNavigation: [
        { label: 'Product', href: '/#product' },
        { label: 'Features', href: '/#features' },
        { label: 'Pricing', href: '/#pricing' },
      ],
      footerLinks: [
        { label: 'Privacy', href: '/legal/privacy' },
        { label: 'Terms', href: '/legal/terms' },
      ],
      socialLinks: [],
      defaultSeo: {
        metaTitle: 'Glavito – AI-first omnichannel support platform',
        metaDescription: 'AI agents, omnichannel ticketing, CRM, and workflows in one platform.',
      },
    },
    page: {
      id: 'homepage',
      slug: '/',
      locale,
      title: 'Homepage',
      hero: {
        variant: 'glavai',
        badge: 'AI Agents that convert',
        title: 'AI Agents that convert, where it matters',
        highlight: 'convert',
        subtitle:
          'Transform every conversation into revenue with specialized AI agents for lead nurturing, closing sales, and retaining customers.',
        primaryCtaLabel: 'Start Free Trial',
        primaryCtaHref: '/auth/register',
        secondaryCtaLabel: 'Book a Demo',
        secondaryCtaHref: '#demo',
      },
      sections: [
        {
          id: 'glavai',
          type: 'glavai',
          title: 'GLAVAI',
          heading: 'Meet GLAVAI',
          subheading: 'AI auto-resolve, copilot, and insights for your agents.',
        },
        {
          id: 'features-overview',
          type: 'features_overview',
          title: 'Core Platforms',
          headline: 'Everything You Need to Succeed',
          subheadline: 'Ticketing, CRM, and workflows working together.',
        },
      ],
      status: 'published',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seo: {
        metaTitle: 'Glavito – AI Agents that convert, where it matters',
        metaDescription:
          'GLAVAI auto-resolve, AI copilot, and insights on top of an omnichannel ticketing system, CRM, and workflows.',
      },
    },
  };
}


