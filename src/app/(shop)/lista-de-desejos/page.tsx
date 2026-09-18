// 📄 src/app/(shop)/lista-de-desejos/page.tsx
import type { Metadata } from 'next';
import WishlistPageClient from './WishlistPageClient';

export const metadata: Metadata = {
  title: 'Lista de Desejos - Pro-Lite',
  description:
    'Seus produtos favoritos salvos em um só lugar. Quilhas, wetsuits, leashes, decks e acessórios das melhores marcas do surf.',
  robots: { index: false }, // página pessoal — sem valor para busca
};

export default function ListaDeDesejosPage() {
  return <WishlistPageClient />;
}
