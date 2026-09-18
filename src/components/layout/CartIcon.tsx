'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/context/CartProvider';

export default function CartIcon() {
  const { toggleCart, itemCount } = useCart();

  return (
    <button
      onClick={toggleCart}
      className='relative flex items-center gap-1 text-gray-600 hover:text-brand transition-colors'
      aria-label='Carrinho'
    >
      <ShoppingCart size={22} />
      <span className='absolute -top-1 -right-2 bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center'>
        {itemCount}
      </span>
    </button>
  );
}
