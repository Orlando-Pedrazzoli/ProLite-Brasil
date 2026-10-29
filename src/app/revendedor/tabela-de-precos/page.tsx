// 📄 src/app/revendedor/tabela-de-precos/page.tsx
// TABELA DE PREÇOS DO REVENDEDOR (server component).
//
// Acesso: cookie httpOnly gravado por /revendedor/acesso (link do e-mail
// de aprovação). Sem cookie válido → redireciona para /revendedores com
// aviso. Reprovar/revogar no admin apaga o hash → o cookie morre.
//
// Dados: categorias-raiz + subcategorias (ordem do admin) e TODOS os
// produtos ATIVOS com costPrice > 0 (preço de revenda), incluindo os que
// ainda não estão publicados na loja — o lojista vê a linha completa, a
// loja online publica à medida que tiver fotos. Produtos sem foto saem
// com placeholder. A tabela é sempre a da base de dados: alterou o preço
// no admin, o lojista já vê o novo.
//
// Regra de preço (tabela Pro-Lite): revenda = costPrice; sugerido = price
// (= costPrice × 2,2, igual ao preço praticado no site).

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import connectDB from '@/lib/db/connect';
import Product from '@/lib/models/Product';
import Category from '@/lib/models/Category';
import {
  RESELLER_COOKIE,
  findApprovedResellerByToken,
  touchResellerAccess,
} from '@/lib/services/resellerAccess';
import PriceTableClient, {
  type PriceTableSection,
  type PriceTableRow,
} from './PriceTableClient';

export const dynamic = 'force-dynamic';

interface LeanCategory {
  _id: { toString(): string };
  name: string;
  slug: string;
  parent?: { toString(): string } | null;
  order: number;
  isActive: boolean;
}

interface LeanProduct {
  _id: { toString(): string };
  sku: string;
  name: string;
  slug: string;
  price: number;
  costPrice?: number;
  images?: string[];
  thumbnail?: string;
  category: { toString(): string };
  subcategory?: { toString(): string } | null;
  size?: string;
  productFamily?: string;
  isPublishedOnline: boolean;
  stock: number;
}

export default async function TabelaDePrecosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RESELLER_COOKIE)?.value;
  const reseller = await findApprovedResellerByToken(token);
  if (!reseller) redirect('/revendedores?acesso=invalido');

  await connectDB();
  void touchResellerAccess(reseller._id);

  const [categories, products] = await Promise.all([
    Category.find({ isActive: true })
      .select('name slug parent order isActive')
      .sort({ order: 1, name: 1 })
      .lean<LeanCategory[]>(),
    Product.find({ isActive: true, costPrice: { $gt: 0 } })
      .select(
        'sku name slug price costPrice images thumbnail category subcategory size productFamily isPublishedOnline stock',
      )
      .sort({ name: 1 })
      .lean<LeanProduct[]>(),
  ]);

  const roots = categories.filter(c => !c.parent);
  const children = categories.filter(c => !!c.parent);

  const toRow = (p: LeanProduct): PriceTableRow => ({
    id: p._id.toString(),
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    image: p.thumbnail || p.images?.[0] || '',
    wholesale: p.costPrice ?? 0,
    retail: p.price,
    size: p.size || '',
    published: p.isPublishedOnline,
  });

  // Ordena por família + tamanho dentro de cada secção (mantém variantes juntas)
  const sortRows = (rows: PriceTableRow[]) =>
    rows.sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR', { numeric: true }),
    );

  const sections: PriceTableSection[] = [];
  for (const root of roots) {
    const rootId = root._id.toString();
    const subs = children.filter(c => c.parent?.toString() === rootId);
    const inRoot = products.filter(p => p.category.toString() === rootId);
    if (inRoot.length === 0) continue;

    const groups: PriceTableSection['groups'] = [];
    for (const sub of subs) {
      const subId = sub._id.toString();
      const rows = inRoot
        .filter(p => p.subcategory?.toString() === subId)
        .map(toRow);
      if (rows.length) groups.push({ title: sub.name, rows: sortRows(rows) });
    }
    const subIds = new Set(subs.map(s => s._id.toString()));
    const loose = inRoot
      .filter(p => !p.subcategory || !subIds.has(p.subcategory.toString()))
      .map(toRow);
    if (loose.length)
      groups.push({
        title: groups.length ? 'Outros' : '',
        rows: sortRows(loose),
      });

    sections.push({ title: root.name, slug: root.slug, groups });
  }

  return (
    <PriceTableClient
      sections={sections}
      reseller={{
        tradeName: reseller.tradeName,
        contactName: reseller.contactName,
        cnpj: reseller.cnpj,
      }}
      generatedAt={new Date().toISOString()}
    />
  );
}
