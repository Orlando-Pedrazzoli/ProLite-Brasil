// src/lib/seo/jsonld.ts
// 🧩 Builders de dados estruturados (schema.org / JSON-LD).
// Renderizar com <JsonLd data={...} /> em server components.
// Schemas priorizados: Store+OnlineStore (LocalBusiness), WebSite+SearchAction,
// Product+Offer(+AggregateRating), BreadcrumbList, BlogPosting, CollectionPage,
// FAQPage — os que geram rich results no Google.

import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  LOGO_URL,
  CONTACT,
  SOCIAL_LINKS,
  absoluteUrl,
  toMetaDescription,
} from './config';
import { company } from '@/lib/config/company';

type JsonLdObject = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Site-wide (root layout)
// ---------------------------------------------------------------------------

/**
 * Organização = loja física (Store ⊂ LocalBusiness) + loja online (OnlineStore).
 * Usar os dois tipos no mesmo nó permite ao Google ligar o Knowledge Panel,
 * o Google Business Profile e o e-commerce à mesma entidade (#organization),
 * referenciada por `seller`/`publisher` nos outros schemas.
 */
export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': ['Store', 'OnlineStore'],
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: company.tradeName,
    legalName: company.legalName,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_URL,
      width: 512,
      height: 512,
    },
    image: DEFAULT_OG_IMAGE,
    description: SITE_DESCRIPTION,
    slogan: company.slogan,
    email: CONTACT.email,
    telephone: CONTACT.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.streetAddress,
      addressLocality: CONTACT.addressLocality,
      addressRegion: CONTACT.addressRegion,
      postalCode: CONTACT.postalCode,
      addressCountry: CONTACT.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT.geo.latitude,
      longitude: CONTACT.geo.longitude,
    },
    hasMap: `https://www.google.com/maps?q=${CONTACT.geo.latitude},${CONTACT.geo.longitude}`,
    openingHoursSpecification: CONTACT.openingHours.map(h => ({
      '@type': 'OpeningHoursSpecification',
      ...h,
    })),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: CONTACT.phone,
        email: CONTACT.email,
        availableLanguage: 'Portuguese',
        areaServed: 'BR',
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: CONTACT.whatsapp,
        url: `https://wa.me/${company.whatsapp}`,
        availableLanguage: 'Portuguese',
        areaServed: 'BR',
      },
    ],
    currenciesAccepted: 'BRL',
    paymentAccepted: 'Cartão de crédito, Pix, Boleto',
    priceRange: '$$',
    areaServed: { '@type': 'Country', name: 'Brazil' },
    ...(SOCIAL_LINKS.length > 0 && { sameAs: SOCIAL_LINKS }),
  };
}

export function webSiteJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/busca?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ---------------------------------------------------------------------------
// Produto
// ---------------------------------------------------------------------------

export interface ProductForJsonLd {
  name: string;
  slug: string;
  description?: string;
  richDescription?: string;
  seoDescription?: string;
  sku?: string;
  price: number;
  images?: string[];
  thumbnail?: string;
  stock?: number;
  brand?: { name: string } | null;
  category?: { name: string; slug: string } | null;
  averageRating?: number;
  reviewCount?: number;
  updatedAt?: Date | string;
}

export function productJsonLd(product: ProductForJsonLd): JsonLdObject {
  const url = absoluteUrl(`/produtos/${product.slug}`);
  const images = [
    ...(product.thumbnail ? [product.thumbnail] : []),
    ...(product.images || []),
  ].filter(Boolean);

  // AggregateRating só com dados reais (avaliações aprovadas) — dados
  // inventados violam as diretrizes do Google e podem gerar ação manual.
  const hasRating =
    typeof product.reviewCount === 'number' &&
    product.reviewCount > 0 &&
    typeof product.averageRating === 'number' &&
    product.averageRating > 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    url,
    ...(images.length > 0 && { image: images }),
    description: toMetaDescription(
      product.seoDescription || product.description || product.richDescription,
    ),
    ...(product.sku && { sku: product.sku, mpn: product.sku }),
    ...(product.brand?.name && {
      brand: { '@type': 'Brand', name: product.brand.name },
    }),
    ...(product.category?.name && { category: product.category.name }),
    ...(hasRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.averageRating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        (product.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@id': `${SITE_URL}/#organization` },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BR',
        returnPolicyCategory:
          'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7, // CDC art. 49 — direito de arrependimento
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'BR',
        },
        ...(product.price >= company.shipping.freeShippingMinValue && {
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: 0,
            currency: 'BRL',
          },
        }),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  path: string; // relativo, ex: '/produtos/quilha-fcs-ii'
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Início', path: '/' }, ...items].map(
      (item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      }),
    ),
  };
}

// ---------------------------------------------------------------------------
// Categoria / Marca / Coleção (páginas de listagem)
// ---------------------------------------------------------------------------

export function collectionPageJsonLd(params: {
  name: string;
  description?: string;
  path: string;
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: params.name,
    url: absoluteUrl(params.path),
    description: toMetaDescription(params.description),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    inLanguage: 'pt-BR',
  };
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

export interface BlogPostForJsonLd {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  publishedAt?: Date | string;
  updatedAt?: Date | string;
}

export function blogPostingJsonLd(post: BlogPostForJsonLd): JsonLdObject {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    url,
    mainEntityOfPage: url,
    ...(post.coverImage && { image: [post.coverImage] }),
    description: toMetaDescription(post.excerpt),
    ...(post.publishedAt && {
      datePublished: new Date(post.publishedAt).toISOString(),
    }),
    ...(post.updatedAt && {
      dateModified: new Date(post.updatedAt).toISOString(),
    }),
    author: {
      '@type': 'Person',
      name: post.author || SITE_NAME,
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'pt-BR',
  };
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export interface FaqEntry {
  question: string;
  answer: string;
}

export function faqPageJsonLd(entries: FaqEntry[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  };
}
