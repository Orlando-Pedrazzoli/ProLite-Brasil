// src/app/(shop)/produtos/[slug]/page.tsx
// 🔍 Server wrapper SEO da página de produto.
// Gera metadata dinâmica (title, description, canonical, Open Graph) e injeta
// JSON-LD Product (+AggregateRating quando há avaliações) + BreadcrumbList.
// Usa seoTitle/seoDescription preenchidos no admin, com fallback automático.
// A UI interativa vive em ProductPageClient.

import type { Metadata } from 'next';
import ProductPageClient from './ProductPageClient';
import JsonLd from '@/components/seo/JsonLd';
import { getProductForSeo } from '@/lib/seo/queries';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import {
  toMetaDescription,
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
} from '@/lib/seo/config';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductForSeo(slug);

  if (!product) {
    return {
      title: 'Produto não encontrado',
      robots: { index: false, follow: false },
    };
  }

  // 1º seoTitle do admin; senão "Nome — Marca" (o template do layout junta "| Pro-Lite")
  const title =
    product.seoTitle?.trim() ||
    (product.brand?.name && product.brand.name !== SITE_NAME
      ? `${product.name} — ${product.brand.name}`
      : product.name);

  // 1º seoDescription do admin; senão descrição curta; senão rica; senão
  // fallback com nome + categoria (nunca a descrição genérica do site)
  const description = toMetaDescription(
    product.seoDescription || product.description || product.richDescription,
    `${product.name}${product.category?.name ? ` — ${product.category.name}` : ''} original ${SITE_NAME}. Fabricação própria em São Paulo, até 10x sem juros e envio para todo o Brasil.`,
  );
  const canonical = `/produtos/${product.slug}`;
  const ogImage = product.thumbnail || product.images?.[0] || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: absoluteUrl(canonical),
      title,
      description,
      images: [{ url: ogImage, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductForSeo(slug);

  return (
    <>
      {product && (
        <>
          <JsonLd data={productJsonLd(product)} />
          <JsonLd
            data={breadcrumbJsonLd([
              ...(product.category
                ? [
                    {
                      name: product.category.name,
                      path: `/categoria/${product.category.slug}`,
                    },
                  ]
                : []),
              { name: product.name, path: `/produtos/${product.slug}` },
            ])}
          />
        </>
      )}
      <ProductPageClient params={params} />
    </>
  );
}
