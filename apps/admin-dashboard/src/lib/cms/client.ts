import { getCmsConfig, buildSanityQueryUrl, getMockHomepagePayload } from './config';
import type { HomepagePayload } from './types';

/**
 * Read-only CMS client used by our Next.js app.
 * For now this is a very small wrapper over Sanity's HTTP API.
 */
export const cmsClient = {
  async getHomepage(locale: string): Promise<HomepagePayload> {
    const config = getCmsConfig();
    if (!config) {
      return getMockHomepagePayload(locale);
    }

    const query = `
      *[_type == "page" && slug.current == "home" && locale == $locale][0]{
        "id": _id,
        "slug": slug.current,
        title,
        locale,
        hero,
        sections,
        "seo": seo{
          metaTitle,
          metaDescription,
          "ogImageUrl": ogImage.asset->url
        },
        status,
        publishedAt,
        _updatedAt
      }
    `;

    const url = buildSanityQueryUrl(config, query, { locale });

    try {
      const res = await fetch(url, {
        headers: config.readToken
          ? {
              Authorization: `Bearer ${config.readToken}`,
            }
          : undefined,
        // Sanity CDN is cache friendly; marketing content is fine to cache briefly
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        // Fallback to mock content so the page never breaks in case of CMS issues
        return getMockHomepagePayload(locale);
      }

      const json = (await res.json()) as {
        result?: {
          id?: string;
          slug?: string;
          title?: string;
          locale?: string;
          hero?: import('./types').HeroContent;
          sections?: import('./types').PageSectionContent[];
          seo?: import('./types').SeoFields;
          status?: string;
          publishedAt?: string;
          _updatedAt?: string;
        };
      };
      const page = json.result;
      if (!page) {
        return getMockHomepagePayload(locale);
      }

      return {
        siteSettings: undefined,
        page: {
          id: String(page.id),
          slug: String(page.slug || '/'),
          locale: String(page.locale || locale),
          title: String(page.title || 'Homepage'),
          hero: page.hero || getMockHomepagePayload(locale).page.hero,
          sections: Array.isArray(page.sections) ? page.sections : getMockHomepagePayload(locale).page.sections,
          seo: page.seo,
          status: page.status === 'published' ? 'published' : 'draft',
          publishedAt: page.publishedAt,
          updatedAt: page._updatedAt,
        },
      };
    } catch {
      return getMockHomepagePayload(locale);
    }
  },
};


