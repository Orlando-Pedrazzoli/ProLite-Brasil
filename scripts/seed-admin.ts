// scripts/seed-admin.ts
// ============================================================
// Cria (ou repõe) o utilizador ADMIN da loja.
//
// SEM credenciais por omissão: o e-mail e a senha vêm OBRIGATORIAMENTE
// do .env.local. O script antigo caía em admin@surfersparadise.com.br /
// admin123456 quando as variáveis faltavam, e essas credenciais estão
// no histórico do repositório, ou seja, são públicas.
//
// .env.local:
//   ADMIN_EMAIL=...
//   ADMIN_PASSWORD=...      (mínimo 12 caracteres)
//
// Uso (na raiz do projeto):
//   npx tsx scripts/seed-admin.ts           cria o admin, se não existir
//   npx tsx scripts/seed-admin.ts --reset   se já existir, troca-lhe a senha
//
// Em qualquer dos modos, remove o admin padrão herdado
// (admin@surfersparadise.com.br), se ainda estiver na base.
// ============================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const LEGACY_DEFAULT_EMAIL = 'admin@surfersparadise.com.br';
const MIN_PASSWORD_LENGTH = 12;
const RESET = process.argv.includes('--reset');

const MONGODB_URI = process.env.MONGODB_URI;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!MONGODB_URI) fail('MONGODB_URI não definida no .env.local');
if (!adminEmail) fail('ADMIN_EMAIL não definido no .env.local');
if (!adminPassword) fail('ADMIN_PASSWORD não definido no .env.local');
if (adminEmail === LEGACY_DEFAULT_EMAIL)
  fail(
    'ADMIN_EMAIL não pode ser o e-mail padrão herdado. Use um e-mail da Pro-Lite.',
  );
if (adminPassword.length < MIN_PASSWORD_LENGTH)
  fail(
    `ADMIN_PASSWORD tem de ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  );
if (/^admin\d*$/i.test(adminPassword))
  fail('ADMIN_PASSWORD demasiado óbvia. Use uma senha gerada.');

async function seedAdmin(): Promise<void> {
  await mongoose.connect(MONGODB_URI!);
  console.log(`✅ MongoDB connected (${mongoose.connection.name})`);

  const users = mongoose.connection.collection('users');

  // Remover o admin padrão herdado, cujas credenciais são públicas.
  const legacy = await users.deleteMany({ email: LEGACY_DEFAULT_EMAIL });
  if (legacy.deletedCount > 0)
    console.log(`🧹 Admin padrão herdado removido (${LEGACY_DEFAULT_EMAIL}).`);

  const hashedPassword = await bcrypt.hash(adminPassword!, 12);
  const existing = await users.findOne({ email: adminEmail });

  if (existing) {
    if (!RESET) {
      console.log(`⚠️  Admin já existe: ${adminEmail}`);
      console.log('   Para lhe trocar a senha, corra de novo com --reset.');
    } else {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            password: hashedPassword,
            role: 'admin',
            updatedAt: new Date(),
          },
        },
      );
      console.log(`✅ Senha do admin reposta: ${adminEmail}`);
    }
  } else {
    await users.insertOne({
      name: 'Admin Pro-Lite',
      email: adminEmail,
      password: hashedPassword,
      cpf: '',
      phone: '',
      role: 'admin',
      isEmailVerified: true,
      addresses: [],
      orderCount: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Admin criado: ${adminEmail}`);
  }

  // A senha nunca é impressa: fica só no .env.local.
  console.log('   A senha é a definida em ADMIN_PASSWORD no .env.local.');

  await mongoose.disconnect();
}

seedAdmin().catch(async error => {
  console.error('❌ Erro ao criar admin:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
