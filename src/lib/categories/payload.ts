// src/lib/categories/payload.ts
// Validação e normalização do que o admin envia ao criar/editar categoria.
//
// O `slug` é ÚNICO na coleção inteira (é por ele que a loja encontra a
// categoria). Antes, criar uma categoria cujo slug já existia — o caso
// típico é uma subcategoria com o mesmo nome noutro departamento, ex.
// "Diversos" em Acessórios e em Capas — rebentava no índice único do
// MongoDB e o painel só mostrava "Erro ao criar categoria".

import mongoose from 'mongoose';
import Category from '@/lib/models/Category';
import { slugify } from '@/lib/utils/slugify';

export class CategoryInputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Erro de índice único do MongoDB (E11000). */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * Devolve só os campos permitidos, já normalizados:
 *  • nome obrigatório;
 *  • slug limpo (a partir do slug enviado ou do nome);
 *  • categoria-mãe validada e `level` calculado no servidor.
 */
export async function normalizeCategoryInput(
  body: Record<string, unknown>,
  currentId?: string,
) {
  const name = text(body.name);
  if (!name) throw new CategoryInputError('Informe o nome da categoria.');

  const slug = slugify(text(body.slug) || name);
  if (!slug) {
    throw new CategoryInputError(
      'O nome precisa de ter pelo menos uma letra ou número.',
    );
  }

  let parent: mongoose.Types.ObjectId | null = null;
  let parentSlug = '';
  let level = 0;
  const parentId = text(body.parent);
  if (parentId) {
    if (!mongoose.isValidObjectId(parentId)) {
      throw new CategoryInputError('Categoria-mãe inválida.');
    }
    if (currentId && parentId === currentId) {
      throw new CategoryInputError(
        'Uma categoria não pode ser mãe dela própria.',
      );
    }
    const parentDoc = await Category.findById(parentId)
      .select('slug level')
      .lean();
    if (!parentDoc) {
      throw new CategoryInputError(
        'A categoria-mãe escolhida já não existe. Recarregue a página.',
      );
    }
    parent = parentDoc._id;
    parentSlug = parentDoc.slug;
    level = (parentDoc.level ?? 0) + 1;
  }

  const order = Number(body.order);

  return {
    parentSlug,
    data: {
      name,
      slug,
      description: text(body.description),
      image: text(body.image),
      megaImage: text(body.megaImage),
      parent,
      level,
      order: Number.isFinite(order) ? order : 0,
      isActive: body.isActive !== false,
    },
  };
}

/**
 * Slug livre para uma categoria NOVA. Se o pretendido já existe:
 *  1.º tenta juntar o slug da categoria-mãe ("diversos" → "diversos-capas");
 *  2.º acrescenta um número ("diversos-2", "diversos-3", …).
 */
export async function findFreeSlug(
  slug: string,
  parentSlug: string,
): Promise<string> {
  const taken = async (candidate: string) =>
    !!(await Category.exists({ slug: candidate }));

  if (!(await taken(slug))) return slug;

  if (parentSlug) {
    const withParent = `${slug}-${parentSlug}`;
    if (!(await taken(withParent))) return withParent;
  }

  for (let n = 2; n <= 50; n += 1) {
    const candidate = `${slug}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
  throw new CategoryInputError(
    `Já existem demasiadas categorias com o endereço "${slug}". Escolha outro slug.`,
    409,
  );
}
