import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Category from '@/lib/models/Category';
import {
  CategoryInputError,
  isDuplicateKeyError,
  normalizeCategoryInput,
} from '@/lib/categories/payload';

// GET — single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const category = await Category.findById(id).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoria não encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('GET category error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar categoria' },
      { status: 500 },
    );
  }
}

// PUT — update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const { data } = await normalizeCategoryInput(body, id);

    // Na edição o slug NÃO é trocado sozinho (mudaria o endereço da
    // página na loja): se já pertence a outra categoria, avisa.
    const clash = await Category.exists({ slug: data.slug, _id: { $ne: id } });
    if (clash) {
      throw new CategoryInputError(
        `Já existe outra categoria com o endereço "/${data.slug}". Escolha outro slug.`,
        409,
      );
    }

    const category = await Category.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoria não encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    if (error instanceof CategoryInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Já existe outra categoria com esse endereço.',
        },
        { status: 409 },
      );
    }
    console.error('PUT category error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar categoria' },
      { status: 500 },
    );
  }
}

// DELETE — delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();
    const { id } = await params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Categoria não encontrada' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: 'Categoria removida' });
  } catch (error) {
    console.error('DELETE category error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao remover categoria' },
      { status: 500 },
    );
  }
}
