import { Helmet } from 'react-helmet-async'

type SEOProps = {
  title: string
  description: string
  image?: string
  url?: string
  type?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export const SITE_NAME = 'ValClassifieds'
export const DEFAULT_IMAGE = 'https://www.valclassifieds.com/og-image.png'
export const SITE_URL = 'https://www.valclassifieds.com'

export function SEO({ title, description, image, url, type = 'website', jsonLd }: SEOProps) {
  const pageTitle = `${title} | ${SITE_NAME}`
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL
  const pageImage = image || DEFAULT_IMAGE

  const jsonLdItems = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : []

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={pageUrl} />

      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={pageImage} />

      {jsonLdItems.map((item, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(item)}</script>
      ))}
    </Helmet>
  )
}

export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description: 'The trusted marketplace for your community. Browse hundreds of listings or post your own ad in minutes.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: SITE_URL,
    },
    sameAs: [],
  }
  return (
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  )
}

export function WebsiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/listings?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    description: 'The trusted marketplace for your community.',
  }
  return (
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  )
}

export function BreadcrumbListJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  }
  return (
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  )
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
  numberOfItems,
}: {
  name: string
  description: string
  url: string
  numberOfItems?: number
}) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${url}`,
  }
  if (numberOfItems !== undefined) {
    schema.numberOfItems = numberOfItems
  }
  return (
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  )
}

export function WebPageJsonLd({
  name,
  description,
  url,
  dateModified,
}: {
  name: string
  description: string
  url: string
  dateModified?: string
}) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: `${SITE_URL}${url}`,
  }
  if (dateModified) {
    schema.dateModified = dateModified
  }
  return (
    <script type="application/ld+json">{JSON.stringify(schema)}</script>
  )
}
