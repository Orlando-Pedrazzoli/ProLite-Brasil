import mongoose, { Schema, Model, Types } from 'mongoose';
import { BENTO_SLOT_VALUES, type BentoSlot } from '@/lib/config/bentoSlots';

// Posições da home geridas pelo admin (/admin/configuracoes):
//   hero       → carrossel do topo
//   mid_promo  → 2 banners lado a lado
//   category   → 3 banners (Deck, Leash, Capa)
//   bento      → grelha "bento" de 5 cards (um por categoria, slot fixo)
// A posição 'brand' foi removida — a Pro-Lite é marca única.
export type BannerPosition = 'hero' | 'mid_promo' | 'category' | 'bento';

export interface IBanner {
  _id: Types.ObjectId;
  title: string;
  /** Texto de apoio (usado no bento) */
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  position: BannerPosition;
  /** Só para position = 'bento': card fixo que este banner ocupa */
  slot?: BentoSlot;
  order: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    image: { type: String, required: true },
    mobileImage: { type: String, default: '' },
    link: { type: String, default: '' },
    position: {
      type: String,
      enum: ['hero', 'mid_promo', 'category', 'bento'],
      required: true,
    },
    slot: {
      type: String,
      enum: BENTO_SLOT_VALUES,
      // Obrigatório apenas no bento
      required: function (this: IBanner) {
        return this.position === 'bento';
      },
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true },
);

bannerSchema.index({ position: 1, isActive: 1, order: 1 });
bannerSchema.index({ position: 1, slot: 1 });

const Banner: Model<IBanner> =
  mongoose.models.Banner || mongoose.model<IBanner>('Banner', bannerSchema);

export default Banner;
