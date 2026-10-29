// 📄 src/lib/services/resellerAccess.ts
// Acesso do REVENDEDOR aprovado à tabela de preços.
//
// Fluxo:
//   1. Admin aprova → gera-se um token aleatório; guardamos só o SHA-256
//      no documento (accessTokenHash) e o token em claro vai no link do
//      e-mail: /revendedor/acesso?token=...
//   2. /revendedor/acesso valida o token, grava um cookie httpOnly
//      (RESELLER_COOKIE) e redireciona para a tabela.
//   3. A página da tabela lê o cookie, faz hash e procura o revendedor
//      APROVADO. Reprovar (ou "Revogar acesso") apaga o hash → o cookie
//      deixa de servir imediatamente.
import { createHash, randomBytes } from 'node:crypto';
import connectDB from '@/lib/db/connect';
import Reseller from '@/lib/models/Reseller';
import type { IReseller } from '@/lib/types/reseller';
import { company } from '@/lib/config/company';

export const RESELLER_COOKIE = 'prolite_revendedor';
export const RESELLER_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 dias

export function generateAccessToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('hex');
  return { token, hash: hashAccessToken(token) };
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildAccessUrl(token: string): string {
  return `${company.url}/revendedor/acesso?token=${token}`;
}

/** Revendedor APROVADO dono deste token (ou null). Nunca lança. */
export async function findApprovedResellerByToken(
  token: string | undefined | null,
): Promise<IReseller | null> {
  if (!token || !/^[a-f0-9]{48}$/.test(token)) return null;
  try {
    await connectDB();
    const reseller = await Reseller.findOne({
      accessTokenHash: hashAccessToken(token),
      status: 'approved',
    }).lean<IReseller>();
    return reseller ?? null;
  } catch (e) {
    console.error('[ResellerAccess] erro ao validar token:', e);
    return null;
  }
}

/** Regista um acesso à tabela (best-effort, sem bloquear a página). */
export async function touchResellerAccess(id: IReseller['_id']): Promise<void> {
  try {
    await Reseller.updateOne(
      { _id: id },
      { $set: { lastAccessAt: new Date() }, $inc: { accessCount: 1 } },
    );
  } catch {
    /* ignorar */
  }
}
