// src/lib/seo/queries.ts
// 🔎 Queries lean ao MongoDB usadas por generateMetadata e sitemap.ts.
// Só campos necessários para SEO — nunca dados sensíveis (custo, stock interno).

import { cache } from 'react';
import connectDB from '@/lib/db/connect';
import Product from '@/lib/models/Product';
import Category from '@/lib/models/Category';
import Brand from '@/lib/models/Brand';
import BlogPost from '@/lib/models/BlogPost';

// Filtro da loja pública — o mesmo usado por /api/products
const PUBLIC_PRODUCT_FILTER = { isActive: true, isPublishedOnline: true };

// ---------------------------------------------------------------------------
// Resultado das consultas de página
// ---------------------------------------------------------------------------
// ⚠️ "Não existe" e "a base de dados falhou" NÃO são a mesma coisa:
//  - missing → o registo não existe/está inativo → a página responde noindex
//  - error   → falha temporária do MongoDB → a página NUNCA pode responder
//              noindex, senão o Google exclui do índice um URL válido que
//              está no sitemap ("Excluída pela tag noindex" no Search Console)
export type SeoLookup<T> =
  | { status: 'found'; data: T }
  | { status: 'missing' }
  | { status: 'error' };

const RETRY_DELAY_MS = 250;

// Executa a consulta com 1 nova tentativa antes de desistir — cobre o caso
// típico de falha de ligação no cold start da função serverless.
async function lookup<T>(
  label: string,
  query: () => Promise<T | null>,
): Promise<SeoLookup<T>> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await connectDB();
      const data = await query();
      return data ? { status: 'found', data } : { status: 'missing' };
    } catch (error) {
      console.error(`[seo] falha em ${label} (tentativa ${attempt}/2)`, error);
      if (attempt === 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  return { status: 'error' };
}

export interface SeoProduct {
  name: string;
  slug: string;
  description?: string;
  richDescription?: string;
  sku?: string;
  price: number;
  images?: string[];
  thumbnail?: string;
  stock?: number;
  brand?: { name: string; slug: string } | null;
  category?: { name: string; slug: string } | null;
  seoTitle?: string;
  seoDescription?: string;
  averageRating?: number;
  reviewCount?: number;
  updatedAt?: Date;
}

// `cache` (React) deduplica a consulta entre generateMetadata e a página
// dentro do mesmo pedido — uma ida ao MongoDB em vez de duas.
export const getProductForSeo = cache(
  (slug: string): Promise<SeoLookup<SeoProduct>> =>
    lookup(`getProductForSeo(${slug})`, () =>
      Product.findOne({ slug, ...PUBLIC_PRODUCT_FILTER })
        .select(
          'name slug description richDescription sku price images thumbnail stock brand category seoTitle seoDescription averageRating reviewCount updatedAt',
        )
        .populate('brand', 'name slug')
        .populate('category', 'name slug')
        .lean<SeoProduct>(),
    ),
);

export interface SeoCategory {
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt?: Date;
}

export const getCategoryForSeo = cache(
  (slug: string): Promise<SeoLookup<SeoCategory>> =>
    lookup(`getCategoryForSeo(${slug})`, () =>
      Category.findOne({ slug, isActive: true })
        .select('name slug description seoTitle seoDescription updatedAt')
        .lean<SeoCategory>(),
    ),
);

export interface SeoBrand {
  name: string;
  slug: string;
  description?: string;
  updatedAt?: Date;
}

export const getBrandForSeo = cache(
  (slug: string): Promise<SeoLookup<SeoBrand>> =>
    lookup(`getBrandForSeo(${slug})`, () =>
      Brand.findOne({ slug, isActive: true })
        .select('name slug description updatedAt')
        .lean<SeoBrand>(),
    ),
);

export interface SeoBlogPost {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  publishedAt?: Date;
  updatedAt?: Date;
}

export const getBlogPostForSeo = cache(
  (slug: string): Promise<SeoLookup<SeoBlogPost>> =>
    lookup(`getBlogPostForSeo(${slug})`, () =>
      BlogPost.findOne({ slug, isPublished: true })
        .select('title slug excerpt coverImage author publishedAt updatedAt')
        .lean<SeoBlogPost>(),
    ),
);

// ---------------------------------------------------------------------------
// Listagens para o sitemap
// ---------------------------------------------------------------------------

export interface SlugEntry {
  slug: string;
  updatedAt?: Date;
}

export async function getAllProductSlugs(): Promise<SlugEntry[]> {
  try {
    await connectDB();
    return await Product.find(PUBLIC_PRODUCT_FILTER)
      .select('slug updatedAt')
      .lean<SlugEntry[]>();
  } catch (error) {
    console.error('[seo] falha em getAllProductSlugs', error);
    return [];
  }
}

export async function getAllCategorySlugs(): Promise<SlugEntry[]> {
  try {
    await connectDB();
    return await Category.find({ isActive: true })
      .select('slug updatedAt')
      .lean<SlugEntry[]>();
  } catch (error) {
    console.error('[seo] falha em getAllCategorySlugs', error);
    return [];
  }
}

export async function getAllBrandSlugs(): Promise<SlugEntry[]> {
  try {
    await connectDB();
    return await Brand.find({ isActive: true })
      .select('slug updatedAt')
      .lean<SlugEntry[]>();
  } catch (error) {
    console.error('[seo] falha em getAllBrandSlugs', error);
    return [];
  }
}

export async function getAllBlogSlugs(): Promise<SlugEntry[]> {
  try {
    await connectDB();
    return await BlogPost.find({ isPublished: true })
      .select('slug updatedAt')
      .lean<SlugEntry[]>();
  } catch (error) {
    console.error('[seo] falha em getAllBlogSlugs', error);
    return [];
  }
}
