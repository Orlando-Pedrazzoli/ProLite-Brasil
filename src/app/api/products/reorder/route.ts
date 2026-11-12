// src/app/api/products/reorder/route.ts
// Ordenação manual de produtos — só admin.
//
// GET  ?scope=catalog[&categorySlug=capas]  → produtos na ordem da loja
// GET  ?scope=home                          → carrossel "Novidades" da home
// PUT  { scope: 'catalog' | 'home', ids: string[] } → grava a nova ordem

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/connect';
import Product from '@/lib/models/Product';
import Category from '@/lib/models/Category';
import { requireAdminGuard } from '@/lib/auth/guards';
import { MANUAL_SORT, HOME_SORT, ensureSortOrder } from '@/lib/products/order';

export const dynamic = 'force-dynamic';

const _deps = [Category];
void _deps;

// Mesmo número de cards que a home pede (getHomeNewArrivals)
const HOME_MIN_ITEMS = 8;
const MAX_IDS = 2000;

const LIST_FIELDS =
  'name slug sku images thumbnail stock isActive isPublishedOnline isNewArrival sortOrder homeOrder category';

type LeanItem = {
  _id: unknown;
  name: string;
  slug: string;
  sku?: string;
  images?: string[];
  thumbnail?: string;
  stock?: number;
  isActive?: boolean;
  isPublishedOnline?: boolean;
  isNewArrival?: boolean;
  category?: { name?: string } | null;
};

function toItem(product: LeanItem, auto = false) {
  return {
    _id: String(product._id),
    name: product.name,
    slug: product.slug,
    sku: product.sku || '',
    image: product.images?.[0] || product.thumbnail || '',
    stock: product.stock ?? 0,
    // visível na loja = ativo + publicado online
    isLive: !!product.isActive && !!product.isPublishedOnline,
    categoryName: product.category?.name || '',
    // home: entrou no carrossel pelo preenchimento automático
    auto,
  };
}

export async function GET(request: NextRequest) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'home' ? 'home' : 'catalog';

    if (scope === 'home') {
      const marked = await Product.find({
        isMainVariant: true,
        isNewArrival: true,
      })
        .select(LIST_FIELDS)
        .populate('category', 'name')
        .sort(HOME_SORT)
        .lean<LeanItem[]>();

      const items = marked.map(product => toItem(product));

      // Tal como na home: com menos de 8 novidades visíveis, o site
      // completa com os publicados mais recentes. Mostramos esses aqui
      // (auto: true) para o ecrã espelhar o que o cliente vê.
      const liveCount = items.filter(item => item.isLive).length;
      if (liveCount < HOME_MIN_ITEMS) {
        const seen = new Set(items.map(item => item._id));
        const recent = await Product.find({
          isActive: true,
          isPublishedOnline: true,
          isMainVariant: true,
        })
          .select(LIST_FIELDS)
          .populate('category', 'name')
          .sort({ createdAt: -1 })
          .limit(Math.max(HOME_MIN_ITEMS, 12))
          .lean<LeanItem[]>();

        let visible = liveCount;
        for (const product of recent) {
          if (visible >= HOME_MIN_ITEMS) break;
          const id = String(product._id);
          if (seen.has(id)) continue;
          seen.add(id);
          items.push(toItem(product, true));
          visible += 1;
        }
      }

      return NextResponse.json({
        success: true,
        scope,
        items,
        homeLimit: HOME_MIN_ITEMS,
      });
    }

    // ── catalog ──────────────────────────────────────────────
    const categorySlug = searchParams.get('categorySlug') || '';
    const filter: Record<string, unknown> = { isMainVariant: true };

    if (categorySlug) {
      // Mesma regra da listagem pública (/api/products?categorySlug=)
      const cat = await Category.findOne({ slug: categorySlug }).lean();
      if (!cat) {
        return NextResponse.json(
          { success: false, error: 'Categoria não encontrada' },
          { status: 404 },
        );
      }
      if (cat.level === 0) {
        const subcats = await Category.find({ parent: cat._id })
          .select('_id')
          .lean();
        filter.category = { $in: [cat._id, ...subcats.map(s => s._id)] };
      } else {
        filter.subcategory = cat._id;
      }
    }

    const products = await Product.find(filter)
      .select(LIST_FIELDS)
      .populate('category', 'name')
      .sort(MANUAL_SORT)
      .lean<LeanItem[]>();

    return NextResponse.json({
      success: true,
      scope,
      items: products.map(product => toItem(product)),
    });
  } catch (error) {
    console.error('GET products/reorder error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar a ordem dos produtos' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireAdminGuard();
  if (guard.response) return guard.response;

  try {
    await connectDB();
    const body = (await request.json()) as { scope?: string; ids?: unknown };
    const scope = body.scope === 'home' ? 'home' : 'catalog';

    if (!Array.isArray(body.ids) || body.ids.length > MAX_IDS) {
      return NextResponse.json(
        { success: false, error: 'Lista de produtos inválida' },
        { status: 400 },
      );
    }

    // Só ObjectIds válidos, sem repetidos, mantendo a ordem recebida
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const raw of body.ids) {
      if (typeof raw !== 'string' || !mongoose.isValidObjectId(raw)) {
        return NextResponse.json(
          { success: false, error: 'Lista de produtos inválida' },
          { status: 400 },
        );
      }
      if (seen.has(raw)) continue;
      seen.add(raw);
      ids.push(raw);
    }

    if (scope === 'home') {
      // A lista recebida passa a SER o carrossel: quem está nela fica
      // marcado como Novidade na posição dada; quem saiu é desmarcado.
      const operations: Parameters<typeof Product.bulkWrite>[0] = ids.map(
        (id, index) => ({
          updateOne: {
            filter: { _id: id },
            update: { $set: { isNewArrival: true, homeOrder: index + 1 } },
            timestamps: false,
          },
        }),
      );
      operations.push({
        updateMany: {
          filter: {
            isMainVariant: true,
            isNewArrival: true,
            _id: { $nin: ids },
          },
          update: { $set: { isNewArrival: false, homeOrder: null } },
          timestamps: false,
        },
      });
      await Product.bulkWrite(operations, { ordered: false });
      return NextResponse.json({ success: true, updated: ids.length });
    }

    // ── catalog ──────────────────────────────────────────────
    if (ids.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    // Todos os produtos passam a ter posição (1..N) na ordem atual
    await ensureSortOrder();

    // Os produtos recebidos trocam ENTRE SI as posições que já ocupam na
    // ordem global — o resto do catálogo não se mexe.
    const current = await Product.find({ _id: { $in: ids } })
      .select('sortOrder')
      .lean<{ _id: unknown; sortOrder?: number | null }[]>();

    const existing = new Set(current.map(doc => String(doc._id)));
    const orderedIds = ids.filter(id => existing.has(id));
    const slots = current
      .map(doc => doc.sortOrder ?? 0)
      .sort((a, b) => a - b);

    await Product.bulkWrite(
      orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { sortOrder: slots[index] } },
          timestamps: false,
        },
      })),
      { ordered: false },
    );

    return NextResponse.json({ success: true, updated: orderedIds.length });
  } catch (error) {
    console.error('PUT products/reorder error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar a ordem dos produtos' },
      { status: 500 },
    );
  }
}
