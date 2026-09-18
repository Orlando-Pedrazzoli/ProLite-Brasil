// scripts/seed-prolite-catalog.ts
// ============================================================
// IMPORTAÇÃO DO CATÁLOGO PRO-LITE (marca + categorias + produtos)
//
// Fonte: scripts/data/prolite-catalog.json, gerado a partir da
// "Tabela Pro-Lite 2026". O JSON só tem o PREÇO FINAL (lojista x 2,2);
// não contém preço de atacado nem estoque.
//
// NÃO DESTRUTIVO e IDEMPOTENTE:
//   • nunca apaga nada;
//   • categoria/marca que já existe (pelo slug) é reaproveitada;
//   • produto que já existe (pelo SKU) é IGNORADO, para não pisar
//     fotos, descrições e estoque preenchidos à mão no admin;
//   • pode ser corrido várias vezes sem duplicar.
//
// Os produtos entram como RASCUNHO: estoque 0 e isPublishedOnline false.
// O próprio modelo Product só deixa publicar quando o produto tiver
// descrição (20+ caracteres), imagem, peso e dimensões.
//
// Uso (na raiz do projeto):
//   npx tsx scripts/seed-prolite-catalog.ts --dry            só valida e mostra o plano, sem tocar na base
//   npx tsx scripts/seed-prolite-catalog.ts                  importa
//   npx tsx scripts/seed-prolite-catalog.ts --update-prices  importa e ATUALIZA o preço dos SKUs já existentes
// ============================================================

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mongoose from 'mongoose';
import Product from '../src/lib/models/Product';
import Category from '../src/lib/models/Category';
import Brand from '../src/lib/models/Brand';

interface CatalogCategory {
  name: string;
  slug: string;
  children: { name: string; slug: string }[];
}
interface CatalogProduct {
  sku: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string;
  price: number;
  ncm: string;
  size: string;
  productFamily: string;
  isMainVariant: boolean;
  specifications: { key: string; value: string }[];
  tags: string[];
}
interface Catalog {
  brand: { name: string; slug: string };
  categories: CatalogCategory[];
  products: CatalogProduct[];
  skipped: { sku: string; name: string; model: string; reason: string }[];
}

const DRY = process.argv.includes('--dry');
const UPDATE_PRICES = process.argv.includes('--update-prices');

const catalog: Catalog = JSON.parse(
  readFileSync(
    join(process.cwd(), 'scripts', 'data', 'prolite-catalog.json'),
    'utf8',
  ),
);

// ── Validação dos dados (corre sempre, mesmo em --dry) ───────────────
function validate(): void {
  const errors: string[] = [];
  const skus = new Set<string>();
  const slugs = new Set<string>();
  const roots = new Map(catalog.categories.map(c => [c.name, c]));

  for (const p of catalog.products) {
    if (skus.has(p.sku)) errors.push(`SKU duplicado: ${p.sku}`);
    if (slugs.has(p.slug)) errors.push(`Slug duplicado: ${p.slug}`);
    skus.add(p.sku);
    slugs.add(p.slug);
    if (!(p.price > 0)) errors.push(`Preço inválido no SKU ${p.sku}`);
    const root = roots.get(p.category);
    if (!root)
      errors.push(`Categoria desconhecida "${p.category}" no SKU ${p.sku}`);
    else if (
      p.subcategory &&
      !root.children.some(ch => ch.name === p.subcategory)
    )
      errors.push(
        `Subcategoria desconhecida "${p.subcategory}" no SKU ${p.sku}`,
      );
  }

  if (errors.length) {
    console.error(
      '❌ Dados inválidos:\n' + errors.map(e => '   • ' + e).join('\n'),
    );
    process.exit(1);
  }
}

function printPlan(): void {
  console.log('\n📦 Catálogo Pro-Lite');
  console.log(`   Marca: ${catalog.brand.name}`);
  for (const c of catalog.categories) {
    const total = catalog.products.filter(p => p.category === c.name).length;
    console.log(
      `   ${c.name.padEnd(12)} ${String(total).padStart(3)} produtos`,
    );
    for (const ch of c.children) {
      const n = catalog.products.filter(
        p => p.category === c.name && p.subcategory === ch.name,
      ).length;
      console.log(`      └ ${ch.name.padEnd(24)} ${String(n).padStart(3)}`);
    }
  }
  console.log(
    `   ${'TOTAL'.padEnd(12)} ${String(catalog.products.length).padStart(3)} produtos`,
  );

  const review = catalog.products.filter(p => p.tags.includes('rever-nome'));
  console.log(
    `\n✏️  ${review.length} produtos com a tag "rever-nome" (nome reescrito para "compatível com ...": conferir no admin).`,
  );
  console.log(
    `\n⏭️  ${catalog.skipped.length} linhas da tabela NÃO importadas (precisam de decisão do cliente):`,
  );
  for (const s of catalog.skipped)
    console.log(
      `   • ${s.sku.padEnd(8)} ${(s.name + ' ' + s.model).trim().padEnd(48)} ${s.reason}`,
    );
}

async function run(): Promise<void> {
  validate();
  printPlan();

  if (DRY) {
    console.log('\n[DRY RUN] Nada foi gravado na base de dados.\n');
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI não definida no .env.local');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`\n✅ Ligado a: ${mongoose.connection.name}`);
  if (mongoose.connection.name === 'test')
    console.warn(
      '⚠️  A base chama-se "test": falta o nome da base na MONGODB_URI.',
    );

  // Marca
  let brand = await Brand.findOne({ slug: catalog.brand.slug });
  if (!brand)
    brand = await Brand.create({
      ...catalog.brand,
      isActive: true,
      isFeatured: true,
    });

  // Categorias (raiz = level 0, subcategoria = level 1)
  const rootId = new Map<string, mongoose.Types.ObjectId>();
  const subId = new Map<string, mongoose.Types.ObjectId>();
  let catsCreated = 0;

  for (const [i, c] of catalog.categories.entries()) {
    let root = await Category.findOne({ slug: c.slug });
    if (!root) {
      root = await Category.create({
        name: c.name,
        slug: c.slug,
        level: 0,
        order: i + 1,
        parent: null,
      });
      catsCreated++;
    }
    rootId.set(c.name, root._id as mongoose.Types.ObjectId);

    for (const [j, ch] of c.children.entries()) {
      let sub = await Category.findOne({ slug: ch.slug });
      if (!sub) {
        sub = await Category.create({
          name: ch.name,
          slug: ch.slug,
          level: 1,
          order: j + 1,
          parent: root._id,
        });
        catsCreated++;
      }
      subId.set(`${c.name}>${ch.name}`, sub._id as mongoose.Types.ObjectId);
    }
  }

  // Produtos
  let created = 0;
  let existing = 0;
  let priceUpdated = 0;

  for (const p of catalog.products) {
    const found = await Product.findOne({ sku: p.sku });
    if (found) {
      existing++;
      if (UPDATE_PRICES && found.price !== p.price) {
        found.price = p.price;
        await found.save();
        priceUpdated++;
      }
      continue;
    }

    // .save() (e não insertMany) para correr o hook que calcula o
    // completionStatus e bloqueia a publicação de produto incompleto.
    await new Product({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: p.price,
      category: rootId.get(p.category),
      subcategory: p.subcategory
        ? subId.get(`${p.category}>${p.subcategory}`)
        : undefined,
      brand: brand._id,
      stock: 0,
      ncm: p.ncm,
      specifications: p.specifications,
      tags: p.tags,
      productFamily: p.productFamily,
      variantType: p.productFamily ? 'size' : '',
      size: p.size,
      isMainVariant: p.isMainVariant,
      isActive: true,
      isPublishedOnline: false,
    }).save();
    created++;
  }

  // Contadores de produtos por categoria e marca
  for (const id of [...rootId.values()])
    await Category.updateOne(
      { _id: id },
      { productCount: await Product.countDocuments({ category: id }) },
    );
  for (const id of [...subId.values()])
    await Category.updateOne(
      { _id: id },
      { productCount: await Product.countDocuments({ subcategory: id }) },
    );
  await Brand.updateOne(
    { _id: brand._id },
    { productCount: await Product.countDocuments({ brand: brand._id }) },
  );

  console.log('\n──────── RESULTADO ────────');
  console.log(`   Categorias criadas:   ${catsCreated}`);
  console.log(`   Produtos criados:     ${created}`);
  console.log(`   Já existiam (mantidos): ${existing}`);
  if (UPDATE_PRICES) console.log(`   Preços atualizados:   ${priceUpdated}`);
  console.log(
    '\n   Todos os produtos novos estão em RASCUNHO (estoque 0, não publicados).\n',
  );

  await mongoose.disconnect();
}

run().catch(async err => {
  console.error('❌ Erro na importação:', err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
