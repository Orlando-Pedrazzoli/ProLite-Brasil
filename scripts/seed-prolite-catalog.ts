// scripts/seed-prolite-catalog.ts
// ============================================================
// IMPORTAÇÃO / ATUALIZAÇÃO DO CATÁLOGO PRO-LITE
// (marca + categorias + produtos)
//
// Fonte: scripts/data/prolite-catalog.json, gerado a partir da
// "Tabela Pro-Lite 2026" (aba Plan1, gravada em 27/10/2026):
//   • price     = coluna MARK-UP 2,2  → preço de venda no site
//   • costPrice = coluna PREÇO        → preço que o revendedor paga
//
// v2 (tabela de 27/10/2026): o script passou a ATUALIZAR, não só criar.
//
// NÃO DESTRUTIVO e IDEMPOTENTE:
//   • nunca apaga nada;
//   • categoria/marca que já existe (pelo slug) é reaproveitada;
//   • produto que já existe (pelo SKU): atualiza SÓ price, costPrice e
//     ncm — fotos, descrições, estoque, nome e tudo o que foi preenchido
//     à mão no admin ficam intactos (nome só muda com --update-names);
//   • produto que não existe é criado como RASCUNHO (estoque 0, não
//     publicado);
//   • pode ser corrido várias vezes sem duplicar.
//
// Produtos que SAÍRAM da tabela 2026 (ou ficaram com preço zerado) estão
// em `deactivate` no JSON. Só são desativados (isActive=false,
// isPublishedOnline=false) com a flag --deactivate-missing; nunca apagados
// — reativam-se no admin se o Maurício quiser.
//
// Uso (na raiz do projeto, PowerShell):
//   npx tsx scripts/seed-prolite-catalog.ts --dry                 só mostra o plano, sem tocar na base
//   npx tsx scripts/seed-prolite-catalog.ts                       cria novos + atualiza preços dos existentes
//   npx tsx scripts/seed-prolite-catalog.ts --update-names        idem, e também atualiza o NOME dos existentes
//   npx tsx scripts/seed-prolite-catalog.ts --deactivate-missing  idem, e desativa os que saíram da tabela
//   (as flags podem ser combinadas)
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
  costPrice: number;
  ncm: string;
  size: string;
  productFamily: string;
  isMainVariant: boolean;
  specifications: { key: string; value: string }[];
  tags: string[];
}
interface Catalog {
  source: string;
  brand: { name: string; slug: string };
  categories: CatalogCategory[];
  products: CatalogProduct[];
  deactivate: { sku: string; name: string; reason: string }[];
  skipped: { sku: string; name: string; model: string; reason: string }[];
}

const DRY = process.argv.includes('--dry');
const UPDATE_NAMES = process.argv.includes('--update-names');
const DEACTIVATE_MISSING = process.argv.includes('--deactivate-missing');

const catalog: Catalog = JSON.parse(
  readFileSync(
    join(process.cwd(), 'scripts', 'data', 'prolite-catalog.json'),
    'utf8',
  ),
);

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
    if (!(p.costPrice > 0))
      errors.push(`Preço de revendedor inválido no SKU ${p.sku}`);
    // Regra de negócio: preço do site = preço lojista × 2,2
    if (Math.abs(p.costPrice * 2.2 - p.price) > 0.02)
      errors.push(
        `SKU ${p.sku}: price ${p.price} ≠ costPrice ${p.costPrice} × 2,2`,
      );
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
  for (const d of catalog.deactivate)
    if (skus.has(d.sku))
      errors.push(`SKU ${d.sku} está em products E em deactivate`);

  if (errors.length) {
    console.error(
      '❌ Dados inválidos:\n' + errors.map(e => '   • ' + e).join('\n'),
    );
    process.exit(1);
  }
}

function printPlan(): void {
  console.log('\n📦 Catálogo Pro-Lite');
  console.log(`   Fonte: ${catalog.source}`);
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

  console.log(
    `\n🚫 ${catalog.deactivate.length} produtos saíram da tabela 2026 ${
      DEACTIVATE_MISSING
        ? '(serão DESATIVADOS)'
        : '(NÃO serão tocados — use --deactivate-missing para desativar)'
    }:`,
  );
  for (const d of catalog.deactivate)
    console.log(`   • ${d.sku.padEnd(8)} ${d.name.padEnd(48)} ${d.reason}`);

  console.log(
    `\n⏭️  ${catalog.skipped.length} linhas da tabela NÃO importadas (precisam de decisão do cliente):`,
  );
  for (const s of catalog.skipped)
    console.log(
      `   • ${(s.sku || '—').padEnd(8)} ${(s.name + ' ' + s.model).trim().padEnd(48)} ${s.reason}`,
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
  let unchanged = 0;
  let updated = 0;
  const changes: string[] = [];

  for (const p of catalog.products) {
    const found = await Product.findOne({ sku: p.sku });
    if (found) {
      const before = { price: found.price, cost: found.costPrice ?? 0 };
      let dirty = false;

      if (found.price !== p.price) {
        found.price = p.price;
        dirty = true;
      }
      if ((found.costPrice ?? 0) !== p.costPrice) {
        found.costPrice = p.costPrice;
        dirty = true;
      }
      if (p.ncm && found.ncm !== p.ncm) {
        found.ncm = p.ncm;
        dirty = true;
      }
      if (UPDATE_NAMES && found.name !== p.name) {
        found.name = p.name;
        dirty = true;
      }

      if (dirty) {
        // .save() para correr o hook do completionStatus
        await found.save();
        updated++;
        changes.push(
          `   ↻ ${p.sku.padEnd(7)} ${p.name.slice(0, 44).padEnd(44)} site ${brl(before.price)} → ${brl(p.price)} · revenda ${brl(before.cost)} → ${brl(p.costPrice)}`,
        );
      } else {
        unchanged++;
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
      costPrice: p.costPrice,
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

  // Desativação dos que saíram da tabela (opcional, reversível no admin)
  let deactivated = 0;
  if (DEACTIVATE_MISSING) {
    for (const d of catalog.deactivate) {
      const res = await Product.updateOne(
        { sku: d.sku, isActive: true },
        { $set: { isActive: false, isPublishedOnline: false } },
      );
      deactivated += res.modifiedCount;
    }
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

  if (changes.length) {
    console.log('\n──────── PREÇOS ATUALIZADOS ────────');
    for (const c of changes) console.log(c);
  }

  console.log('\n──────── RESULTADO ────────');
  console.log(`   Categorias criadas:        ${catsCreated}`);
  console.log(`   Produtos criados:          ${created}`);
  console.log(`   Produtos atualizados:      ${updated}`);
  console.log(`   Já estavam iguais:         ${unchanged}`);
  if (DEACTIVATE_MISSING)
    console.log(`   Produtos desativados:      ${deactivated}`);
  console.log(
    '\n   Produtos novos entram em RASCUNHO (estoque 0, não publicados).\n',
  );

  await mongoose.disconnect();
}

run().catch(async err => {
  console.error('❌ Erro na importação:', err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
