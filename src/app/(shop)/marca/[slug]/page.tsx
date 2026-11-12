// src/app/(shop)/marca/[slug]/page.tsx
// 🔍 Server wrapper SEO da página de marca.
// Metadata dinâmica + JSON-LD CollectionPage e BreadcrumbList.

import type { Metadata } from 'next';
import BrandPageClient from './BrandPageClient';
import JsonLd from '@/components/seo/JsonLd';
import { getBrandForSeo } from '@/lib/seo/queries';
import { collectionPageJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld';
import {
  toMetaDescription,
  absoluteUrl,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
} from '@/lib/seo/config';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBrandForSeo(slug);

  // Falha temporária da base de dados: devolver só a canonical e herdar o
  // resto do layout (index: true). NUNCA noindex aqui — o URL é válido.
  if (result.status === 'error') {
    return { alternates: { canonical: `/marca/${slug}` } };
  }

  if (result.status === 'missing') {
    return {
      title: 'Marca não encontrada',
      robots: { index: false, follow: false },
    };
  }

  const brand = result.data;

  const title = `${brand.name} — Produtos Originais`;
  const description = toMetaDescription(
    brand.description,
    `Produtos ${brand.name} originais com os melhores preços em até 10x sem juros na ${SITE_NAME}. Envio para todo o Brasil.`,
  );
  const canonical = `/marca/${brand.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: absoluteUrl(canonical),
      title,
      description,
      // openGraph aninhado SUBSTITUI o do layout — sem isto a página fica sem imagem
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getBrandForSeo(slug);
  const brand = result.status === 'found' ? result.data : null;
  const path = `/marca/${slug}`;

  return (
    <>
      {brand && (
        <>
          <JsonLd
            data={collectionPageJsonLd({
              name: brand.name,
              description: brand.description,
              path,
            })}
          />
          <JsonLd data={breadcrumbJsonLd([{ name: brand.name, path }])} />
        </>
      )}
      <BrandPageClient params={params} />
    </>
  );
}
