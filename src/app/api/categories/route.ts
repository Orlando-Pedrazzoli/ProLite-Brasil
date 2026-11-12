import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Category from '@/lib/models/Category';
import {
  CategoryInputError,
  findFreeSlug,
  isDuplicateKeyError,
  normalizeCategoryInput,
} from '@/lib/categories/payload';

// GET — list all categories
export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find()
      .sort({ level: 1, order: 1 })
      .lean();
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('GET categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar categorias' },
      { status: 500 },
    );
  }
}

// POST — create category
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;

    const { data, parentSlug } = await normalizeCategoryInput(body);
    // slug repetido deixou de ser erro: o servidor escolhe um livre
    data.slug = await findFreeSlug(data.slug, parentSlug);

    const category = await Category.create(data);
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    if (error instanceof CategoryInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    if (isDuplicateKeyError(error)) {
      // corrida rara: outro pedido ocupou o slug entre a verificação e o insert
      return NextResponse.json(
        {
          success: false,
          error: 'Já existe uma categoria com esse endereço. Tente de novo.',
        },
        { status: 409 },
      );
    }
    console.error('POST category error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar categoria' },
      { status: 500 },
    );
  }
}
