// 📄 src/lib/types/reseller.ts
// Candidatura de REVENDEDOR (lojista) — formulário público em /revendedores,
// aprovação no admin em /admin/revendedores, acesso à tabela de preços
// em /revendedor/tabela-de-precos.
import { Types } from 'mongoose';

export type ResellerStatus = 'pending' | 'approved' | 'rejected';

export type ResellerStoreType = 'fisica' | 'online' | 'ambas';

export interface IResellerAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface IReseller {
  _id: Types.ObjectId;

  // Empresa
  companyName: string; // razão social
  tradeName: string; // nome fantasia
  cnpj: string; // só dígitos (14)
  stateRegistration?: string; // inscrição estadual
  storeType: ResellerStoreType;
  website?: string; // site ou Instagram
  address: IResellerAddress;

  // Contato
  contactName: string;
  email: string;
  phone: string; // WhatsApp, só dígitos
  message?: string;

  // Fluxo de aprovação
  status: ResellerStatus;
  adminNotes?: string;
  rejectionReason?: string;
  reviewedAt?: Date | null;
  reviewedBy?: Types.ObjectId | null;

  // Acesso à tabela de preços (token enviado por e-mail; guardamos só o hash)
  accessTokenHash?: string;
  accessTokenCreatedAt?: Date | null;
  lastAccessAt?: Date | null;
  accessCount: number;

  // Anti-fraude / auditoria
  ip?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}
