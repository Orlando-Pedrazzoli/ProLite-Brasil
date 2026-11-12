// src/lib/products/order.ts
// Ordenação manual de produtos (admin → Produtos → Ordenar).
//
//  • sortOrder → posição nas listagens da loja (categorias, /produtos,
//    promoções). É UMA ordem global: reordenar dentro de uma categoria só
//    troca as posições entre os produtos dessa categoria, por isso a
//    categoria-raiz, as subcategorias e "todos os produtos" nunca se
//    contradizem.
//  • homeOrder → posição no carrossel "Novidades" da home.
//
// Em sort ascendente o MongoDB põe os `null` primeiro:
//  • sortOrder: produtos ainda sem posição aparecem antes, por mais
//    recentes — é exatamente a ordem antiga, até a primeira gravação.
//  • homeOrder: produto acabado de marcar como "Novidade" aparece em
//    1.º no carrossel até ser reposicionado.

import type { SortOrder, Types } from 'mongoose';
import Product from '@/lib/models/Product';

export const MANUAL_SORT: Record<string, SortOrder> = {
  sortOrder: 1,
  createdAt: -1,
  _id: 1,
};

export const HOME_SORT: Record<string, SortOrder> = {
  homeOrder: 1,
  sortOrder: 1,
  createdAt: -1,
  _id: 1,
};

/** Converte o parâmetro `sort` da API no sort do Mongoose. */
export function resolveProductSort(
  sort: string,
): string | Record<string, SortOrder> {
  if (sort === 'manual') return MANUAL_SORT;
  if (sort === 'home') return HOME_SORT;
  return sort;
}

/**
 * Garante que TODOS os produtos têm sortOrder (1..N), preservando a ordem
 * em que a loja os mostra hoje. Só escreve se existir algum sem posição.
 */
export async function ensureSortOrder(): Promise<void> {
  const missing = await Product.countDocuments({ sortOrder: null });
  if (missing === 0) return;

  const all = await Product.find({})
    .sort(MANUAL_SORT)
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  if (all.length === 0) return;

  await Product.bulkWrite(
    all.map((doc, index) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { sortOrder: index + 1 } },
        // não mexe no updatedAt (usado no lastmod do sitemap)
        timestamps: false,
      },
    })),
    { ordered: false },
  );
}
