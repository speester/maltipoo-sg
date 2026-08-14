// Schema library — see .claude/docs/SCHEMA.md.
// Distinct @ids from Curious Tails everywhere; parentOrganization links the brands.
import { site } from '../data/site';

const ORG_ID = `${site.domain}/#organization`;
const OWNER_ID = `${site.domain}/#owner`;
const WEBSITE_ID = `${site.domain}/#website`;

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: site.brand,
    url: site.domain,
    description: site.positioning,
    telephone: site.phoneDisplay,
    email: site.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      addressLocality: 'Singapore',
      postalCode: '320002',
      addressCountry: 'SG',
    },
    areaServed: { '@type': 'City', name: 'Singapore' },
    parentOrganization: {
      '@type': 'Organization',
      name: site.parent.name,
      url: site.parent.url,
    },
    sameAs: [site.social.gbp, site.social.instagram, site.social.facebook, site.license.registryUrl],
  };
}

export function personSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': OWNER_ID,
    name: site.owners,
    jobTitle: 'AVS licensed pet shop owners',
    description: `Owners of ${site.parent.name}, the AVS licensed pet shop behind ${site.brand} (licence ${site.license.avsNumber}).`,
    worksFor: { '@id': ORG_ID },
    sameAs: [site.social.instagram, site.social.facebook],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: site.brand,
    url: site.domain,
    publisher: { '@id': ORG_ID },
  };
}

export function webPageSchema(opts: {
  path: string;
  title: string;
  description: string;
  aboutName: string;
  datePublished: string;
  dateModified?: string;
}) {
  const url = `${site.domain}${opts.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
    author: { '@id': OWNER_ID },
    about: { '@type': 'Thing', name: opts.aboutName },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${site.domain}${item.url}`,
    })),
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function productSchema(opts: { name: string; description: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    ...(opts.image ? { image: opts.image } : {}),
    brand: { '@type': 'Brand', name: site.brand },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'SGD',
      lowPrice: '3288',
      highPrice: '5988',
      offerCount: 1,
      availability: 'https://schema.org/InStock',
      seller: { '@id': ORG_ID },
    },
  };
}
