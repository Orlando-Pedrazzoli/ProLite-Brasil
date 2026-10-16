import mongoose, { Schema, Model, Types } from 'mongoose';
import {
  HOME_BANNER_POSITION_VALUES,
  HOME_BANNER_SLOT_VALUES,
  getPosition,
  type BannerPosition,
} from '@/lib/config/homeBanners';

// Posições da home geridas pelo admin (/admin/configuracoes).
// A lista (e os slots de cada posição) vive em src/lib/config/homeBanners.ts:
//   hero             → carrossel do topo
//   bento            → grelha de 5 cards (slot fixo por categoria)
//   category_banner  → banner largo de Capas Refletivas / Leashes (slot fixo)
//   store            → fotos da loja em "Nós somos a Pro-Lite" (lista livre)
// As posições antigas 'mid_promo', 'category' e 'brand' foram removidas
// (componentes retirados da home; Pro-Lite é marca única).
export type { BannerPosition };

export interface IBanner {
  _id: Types.ObjectId;
  title: string;
  /** Texto de apoio (usado no bento) */
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  position: BannerPosition;
  /** Só nas posições com slots fixos: qual o card/banner que ocupa */
  slot?: string;
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
      enum: HOME_BANNER_POSITION_VALUES,
      required: true,
    },
    slot: {
      type: String,
      enum: HOME_BANNER_SLOT_VALUES,
      // Obrigatório apenas nas posições com slots fixos
      required: function (this: IBanner) {
        return !!getPosition(this.position)?.slots;
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
