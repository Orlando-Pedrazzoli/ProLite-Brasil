// Produtos da vitrine da home, lidos no servidor para o HTML inicial
// já trazer nome, foto, preço Pix e parcelas — sem skeleton.

import connectDB from '@/lib/db/connect';
import Product from '@/lib/models/Product';

export interface HomeProductCard {
  _id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  thumbnail?: string;
  isOnSale?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  salePercentage?: number;
  productFamily?: string;
  variantType?: 'color' | 'size' | 'both';
  color?: string;
  colorCode?: string;
  colorCode2?: string;
  size?: string;
  isMainVariant?: boolean;
  sku?: string;
  weight?: number;
  stock?: number;
}

const PUBLIC_FILTER = {
  isActive: true,
  isPublishedOnline: true,
  isMainVariant: true,
};

const CARD_FIELDS =
  'name slug price compareAtPrice images thumbnail isOnSale isNewArrival isFeatured salePercentage productFamily variantType color colorCode colorCode2 size isMainVariant sku weight stock';

type LeanCard = {
  _id: unknown;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  thumbnail?: string;
  isOnSale?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  salePercentage?: number;
  productFamily?: string;
  variantType?: 'color' | 'size' | 'both';
  color?: string;
  colorCode?: string;
  colorCode2?: string;
  size?: string;
  isMainVariant?: boolean;
  sku?: string;
  weight?: number;
  stock?: number;
};

function toCard(product: LeanCard): HomeProductCard {
  return {
    _id: String(product._id),
    name: product.name,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice || undefined,
    images: Array.isArray(product.images)
      ? product.images.filter((src): src is string => !!src)
      : [],
    thumbnail: product.thumbnail || undefined,
    isOnSale: !!product.isOnSale,
    isNewArrival: !!product.isNewArrival,
    isFeatured: !!product.isFeatured,
    salePercentage: product.salePercentage || undefined,
    productFamily: product.productFamily || undefined,
    variantType: product.variantType || undefined,
    color: product.color || undefined,
    colorCode: product.colorCode || undefined,
    colorCode2: product.colorCode2 || undefined,
    size: product.size || undefined,
    isMainVariant: product.isMainVariant,
    sku: product.sku || undefined,
    weight: product.weight || undefined,
    stock: product.stock ?? 0,
  };
}

/**
 * Novidades da home. Se houver menos de `minItems` marcados como
 * novidade, completa com os publicados mais recentes — a mesma regra
 * do carrossel no cliente.
 */
export async function getHomeNewArrivals(
  limit = 8,
  minItems = 8,
): Promise<HomeProductCard[]> {
  await connectDB();

  const fresh = await Product.find({ ...PUBLIC_FILTER, isNewArrival: true })
    .select(CARD_FIELDS)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean<LeanCard[]>();

  const list = fresh.map(toCard);

  if (list.length < minItems) {
    const recent = await Product.find(PUBLIC_FILTER)
      .select(CARD_FIELDS)
      .sort({ createdAt: -1 })
      .limit(Math.max(minItems, 12))
      .lean<LeanCard[]>();

    const seen = new Set(list.map(product => product._id));
    for (const product of recent.map(toCard)) {
      if (list.length >= minItems) break;
      if (seen.has(product._id)) continue;
      seen.add(product._id);
      list.push(product);
    }
  }

  return list;
}
