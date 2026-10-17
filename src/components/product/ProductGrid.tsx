'use client';

import { useSyncExternalStore } from 'react';
import ProductCard from '@/components/product/ProductCard';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Square,
  LayoutGrid,
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  thumbnail?: string;
  isOnSale?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  salePercentage?: number;
  productFamily?: string;
  variantType?: 'color' | 'size' | 'both';
  color?: string;
  colorCode?: string;
  colorCode2?: string;
  size?: string;
  isMainVariant?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  showViewToggle?: boolean;
}

type MobileViewMode = '1' | '2';
// Chave nova (v2): o default passou a 2 colunas; a chave antiga
// ('sp-mobile-view-mode') guardava '1' para quem já tinha visitado e
// ficaria presa no layout antigo.
const VIEW_MODE_KEY = 'prolite-mobile-view-mode-v2';

// ───── store mínimo sobre o localStorage (para useSyncExternalStore) ─────
const viewModeListeners = new Set<() => void>();
function subscribeViewMode(listener: () => void) {
  viewModeListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === VIEW_MODE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    viewModeListeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
function getViewModeSnapshot(): MobileViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === '1' ? '1' : '2';
  } catch {
    return '2';
  }
}

export default function ProductGrid({
  products,
  loading,
  pagination,
  onPageChange,
  showViewToggle = true,
}: ProductGridProps) {
  // Default: 2 colunas no mobile (padrão das lojas de surf de referência);
  // o toggle continua disponível para quem preferir 1 coluna.
  // A preferência vive no localStorage e é lida via useSyncExternalStore
  // (sem setState em effect e sem mismatch de hidratação: no servidor
  // e no primeiro render do cliente usa-se sempre o default '2').
  const mobileView = useSyncExternalStore(
    subscribeViewMode,
    getViewModeSnapshot,
    () => '2' as MobileViewMode,
  );
  const setMobileView = (mode: MobileViewMode) => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // localStorage indisponível (modo privado, etc.) — ignora
    }
    // storage event não dispara na própria aba — notifica à mão
    viewModeListeners.forEach(l => l());
  };

  // Grid classes: mobile uses view mode; desktop always 3-4 cols
  const gridClasses =
    mobileView === '1'
      ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-4'
      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4';

  if (loading) {
    return (
      <div>
        {showViewToggle && (
          <div className='md:hidden flex justify-end mb-3'>
            <div className='inline-flex border border-gray-300 rounded-md overflow-hidden bg-white'>
              <div className='w-10 h-9 bg-gray-100 animate-pulse' />
              <div className='w-10 h-9 bg-gray-100 animate-pulse border-l border-gray-300' />
            </div>
          </div>
        )}
        <div
          className={
            mobileView === '1'
              ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
              : 'grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4'
          }
        >
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className='bg-gray-100 rounded-lg animate-pulse aspect-[3/4]'
            />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className='text-center py-16'>
        <Package size={48} className='mx-auto mb-4 text-gray-300' />
        <p className='text-gray-500 text-lg'>Nenhum produto encontrado</p>
        <p className='text-gray-400 text-sm mt-1'>
          Tente ajustar os filtros ou buscar por outro termo
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ─── View Toggle (mobile only) ────────────── */}
      {showViewToggle && (
        <div className='md:hidden flex justify-end mb-3'>
          <div
            className='inline-flex border border-gray-300 rounded-md overflow-hidden bg-white'
            role='group'
            aria-label='Modo de visualização'
          >
            <button
              onClick={() => setMobileView('1')}
              className={`w-10 h-9 flex items-center justify-center transition-colors ${
                mobileView === '1'
                  ? 'bg-chumbo text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              aria-label='Ver 1 produto por linha'
              aria-pressed={mobileView === '1'}
            >
              <Square size={18} />
            </button>
            <button
              onClick={() => setMobileView('2')}
              className={`w-10 h-9 flex items-center justify-center transition-colors border-l border-gray-300 ${
                mobileView === '2'
                  ? 'bg-chumbo text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
              aria-label='Ver 2 produtos por linha'
              aria-pressed={mobileView === '2'}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Product Grid ─────────────────────────── */}
      <div className={gridClasses}>
        {products.map(product => (
          <ProductCard
            key={product._id}
            product={product}
            expanded={mobileView === '1'}
          />
        ))}
      </div>

      {/* ─── Pagination ───────────────────────────── */}
      {pagination && pagination.pages > 1 && onPageChange && (
        <div className='flex items-center justify-center gap-1 md:gap-2 mt-8 flex-wrap'>
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className='p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            aria-label='Página anterior'
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: pagination.pages }, (_, i) => i + 1)
            .filter(p => {
              if (pagination.pages <= 7) return true;
              if (p === 1 || p === pagination.pages) return true;
              if (Math.abs(p - pagination.page) <= 1) return true;
              return false;
            })
            .map((p, i, arr) => {
              const showEllipsis = i > 0 && p - arr[i - 1] > 1;
              return (
                <span key={p} className='flex items-center gap-1'>
                  {showEllipsis && (
                    <span className='px-1 text-gray-400'>...</span>
                  )}
                  <button
                    onClick={() => onPageChange(p)}
                    className={`w-9 h-9 rounded-md text-sm font-medium transition-colors ${
                      p === pagination.page
                        ? 'bg-brand text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    aria-label={`Página ${p}`}
                    aria-current={p === pagination.page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                </span>
              );
            })}

          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className='p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            aria-label='Próxima página'
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
