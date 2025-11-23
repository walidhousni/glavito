export interface SeoFields {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
}

export interface NavigationLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface SiteSettings {
  siteTitle: string;
  tagline?: string;
  logoUrl?: string;
  primaryNavigation: NavigationLink[];
  footerLinks: NavigationLink[];
  socialLinks: {
    platform: 'twitter' | 'linkedin' | 'github' | 'facebook' | 'instagram' | 'youtube' | string;
    url: string;
  }[];
  defaultSeo?: SeoFields;
}

export type HeroVariant = 'default' | 'glavai' | 'product';

export interface HeroContent {
  variant: HeroVariant;
  badge?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export type PageSectionType =
  | 'hero'
  | 'glavai'
  | 'features_overview'
  | 'pricing'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'custom_rich';

export interface BaseSection {
  id: string;
  type: PageSectionType;
  title?: string;
}

export interface GlavaiSectionContent extends BaseSection {
  type: 'glavai';
  heading: string;
  subheading?: string;
}

export interface FeaturesOverviewSectionContent extends BaseSection {
  type: 'features_overview';
  headline: string;
  subheadline?: string;
}

export interface CtaSectionContent extends BaseSection {
  type: 'cta';
  headline: string;
  subheadline?: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export interface CustomRichSectionContent extends BaseSection {
  type: 'custom_rich';
  body: string;
}

export type PageSectionContent =
  | GlavaiSectionContent
  | FeaturesOverviewSectionContent
  | CtaSectionContent
  | CustomRichSectionContent
  | BaseSection;

export interface PageContent {
  id: string;
  slug: string;
  locale: string;
  title: string;
  hero?: HeroContent;
  sections: PageSectionContent[];
  seo?: SeoFields;
  status: 'draft' | 'published';
  publishedAt?: string;
  updatedAt?: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  slug: string;
  order?: number;
  locale: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  categoryId: string;
  tags?: string[];
  order?: number;
  status: 'draft' | 'published';
  locale: string;
}

export interface DocCategory {
  id: string;
  title: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  iconKey?: string;
  order?: number;
  locale: string;
}

export type DocDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface DocArticle {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  locale: string;
  body: string;
  summary?: string;
  difficulty?: DocDifficulty;
  productArea?: string;
  estimatedReadMinutes?: number;
  relatedArticleIds?: string[];
  status: 'draft' | 'published';
  publishedAt?: string;
  updatedAt?: string;
  seo?: SeoFields;
}

export interface HomepagePayload {
  siteSettings?: SiteSettings;
  page: PageContent;
}


