// 📄 src/lib/models/Reseller.ts
// Candidaturas de revendedor (lojista). Ver src/lib/types/reseller.ts.
//
// Índices: `cnpj` e `email` com unique — um lojista candidata-se uma vez;
// se for reprovado e quiser tentar de novo, o admin apaga a candidatura
// antiga (ou reaprova). `accessTokenHash` indexado para o lookup do
// cookie/link de acesso à tabela de preços.
import mongoose, { Schema, Model } from 'mongoose';
import { IReseller } from '@/lib/types/reseller';

const resellerSchema = new Schema<IReseller>(
  {
    // Empresa
    companyName: { type: String, required: true, trim: true, maxlength: 160 },
    tradeName: { type: String, required: true, trim: true, maxlength: 120 },
    cnpj: { type: String, required: true, unique: true, trim: true },
    stateRegistration: { type: String, default: '', trim: true, maxlength: 30 },
    storeType: {
      type: String,
      enum: ['fisica', 'online', 'ambas'],
      default: 'fisica',
    },
    website: { type: String, default: '', trim: true, maxlength: 200 },
    address: {
      cep: { type: String, default: '', trim: true },
      street: { type: String, default: '', trim: true },
      number: { type: String, default: '', trim: true },
      complement: { type: String, default: '', trim: true },
      neighborhood: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true, uppercase: true },
    },

    // Contato
    contactName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    message: { type: String, default: '', maxlength: 2000 },

    // Fluxo de aprovação
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String, default: '', maxlength: 2000 },
    rejectionReason: { type: String, default: '', maxlength: 1000 },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Acesso à tabela de preços
    accessTokenHash: { type: String, default: '', index: true },
    accessTokenCreatedAt: { type: Date, default: null },
    lastAccessAt: { type: Date, default: null },
    accessCount: { type: Number, default: 0 },

    // Auditoria
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

// Listagem do admin (mais recentes primeiro, por status)
resellerSchema.index({ status: 1, createdAt: -1 });

const Reseller: Model<IReseller> =
  mongoose.models.Reseller ||
  mongoose.model<IReseller>('Reseller', resellerSchema);

export default Reseller;
