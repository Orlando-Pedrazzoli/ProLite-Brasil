// src/app/admin/produtos/ordenar/page.tsx
// Ordenação manual dos produtos.
//
//  • Aba "Loja": ordem nas páginas de categoria e em /produtos. Escolhe-se
//    a categoria (ou todos) e arrasta-se. É uma ordem global — mexer numa
//    subcategoria reflete-se na categoria-raiz e vice-versa.
//  • Aba "Home": o carrossel "Novidades". A lista É o carrossel: dá para
//    ordenar, remover e adicionar produtos.
//
// Arrastar pelo ícone ⠿ (rato ou dedo), setas ↑ ↓, ou escrever o número da
// posição e Enter — útil em listas longas.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Reorder, useDragControls } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  GripVertical,
  Home,
  LayoutGrid,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Save,
  Search,
  X,
} from 'lucide-react';

type Scope = 'catalog' | 'home';

interface OrderItem {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  image: string;
  stock: number;
  isLive: boolean;
  categoryName: string;
  auto: boolean;
}

interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
  parent?: string | null;
  level?: number;
}

interface SearchProduct {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  images?: string[];
  thumbnail?: string;
  stock?: number;
  isActive?: boolean;
  isPublishedOnline?: boolean;
  isMainVariant?: boolean;
  category?: { name?: string } | null;
}

const idsKey = (list: OrderItem[]) => list.map(item => item._id).join(',');

function moveItem(list: OrderItem[], from: number, to: number): OrderItem[] {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === target) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

// ───────────────────────────────────────────────────────────────
// Linha arrastável
// ───────────────────────────────────────────────────────────────
interface RowProps {
  item: OrderItem;
  index: number;
  total: number;
  scope: Scope;
  /** home: fica fora dos N cards que o carrossel mostra */
  beyondLimit: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}

function OrderRow({
  item,
  index,
  total,
  scope,
  beyondLimit,
  onMove,
  onRemove,
}: RowProps) {
  const controls = useDragControls();
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    const parsed = parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(parsed)) onMove(index, parsed - 1);
  };

  const iconButton =
    'p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className='bg-white border border-gray-200 rounded-lg flex items-center gap-2 sm:gap-3 pr-2 select-none'
      style={{ position: 'relative' }}
      whileDrag={{
        scale: 1.01,
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        zIndex: 10,
      }}
    >
      {/* Pega para arrastar — touch-action none para o dedo não rolar a página */}
      <button
        type='button'
        aria-label={`Arrastar ${item.name}`}
        onPointerDown={event => controls.start(event)}
        className='self-stretch flex items-center px-2 sm:px-3 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing'
        style={{ touchAction: 'none' }}
      >
        <GripVertical size={18} />
      </button>

      {/* Posição (editável) */}
      <input
        type='text'
        inputMode='numeric'
        aria-label='Posição'
        value={draft ?? String(index + 1)}
        onFocus={event => {
          setDraft(String(index + 1));
          event.target.select();
        }}
        onChange={event => setDraft(event.target.value.replace(/\D/g, ''))}
        onBlur={commitDraft}
        onKeyDown={event => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
          if (event.key === 'Escape') setDraft(null);
        }}
        className='w-11 flex-shrink-0 text-center text-sm font-semibold text-gray-700 border border-gray-200 rounded py-1 focus:outline-none focus:ring-2 focus:ring-brand'
      />

      {/* Foto */}
      <div className='py-2 flex-shrink-0'>
        {item.image ? (
          <Image
            src={item.image}
            alt=''
            width={44}
            height={44}
            className='w-11 h-11 rounded object-cover'
            draggable={false}
          />
        ) : (
          <div className='w-11 h-11 bg-gray-100 rounded flex items-center justify-center'>
            <Package size={16} className='text-gray-400' />
          </div>
        )}
      </div>

      {/* Nome + meta */}
      <div className='min-w-0 flex-1 py-2'>
        <p
          className={`text-sm font-medium line-clamp-1 ${
            item.isLive ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {item.name}
        </p>
        <div className='flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-gray-500'>
          {item.sku && <span>{item.sku}</span>}
          {item.categoryName && <span>· {item.categoryName}</span>}
          {!item.isLive && (
            <span className='px-1.5 py-0.5 rounded bg-gray-100 text-gray-600'>
              fora do site
            </span>
          )}
          {item.isLive && item.stock <= 0 && (
            <span className='px-1.5 py-0.5 rounded bg-amber-50 text-amber-700'>
              sem estoque
            </span>
          )}
          {scope === 'home' && item.auto && (
            <span className='px-1.5 py-0.5 rounded bg-brand-50 text-brand-darker'>
              automático
            </span>
          )}
          {scope === 'home' && beyondLimit && (
            <span className='px-1.5 py-0.5 rounded bg-gray-100 text-gray-600'>
              não aparece (além do limite)
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className='flex items-center flex-shrink-0'>
        <button
          type='button'
          title='Mover para o topo'
          aria-label='Mover para o topo'
          disabled={index === 0}
          onClick={() => onMove(index, 0)}
          className={`${iconButton} hidden sm:block`}
        >
          <ArrowUpToLine size={16} />
        </button>
        <button
          type='button'
          title='Subir'
          aria-label='Subir'
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
          className={iconButton}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type='button'
          title='Descer'
          aria-label='Descer'
          disabled={index === total - 1}
          onClick={() => onMove(index, index + 1)}
          className={iconButton}
        >
          <ArrowDown size={16} />
        </button>
        {scope === 'home' && (
          <button
            type='button'
            title='Remover do carrossel'
            aria-label='Remover do carrossel'
            onClick={() => onRemove(item._id)}
            className='p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600'
          >
            <X size={16} />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

// ───────────────────────────────────────────────────────────────
// Página
// ───────────────────────────────────────────────────────────────
export default function OrdenarProdutosPage() {
  const [scope, setScope] = useState<Scope>('catalog');
  const [categorySlug, setCategorySlug] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [items, setItems] = useState<OrderItem[]>([]);
  const [savedItems, setSavedItems] = useState<OrderItem[]>([]);
  const [homeLimit, setHomeLimit] = useState(8);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Home: adicionar produto
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const requestRef = useRef(0);

  // Na home, itens "automáticos" ainda não estão gravados → há algo a salvar
  const dirty =
    idsKey(items) !== idsKey(savedItems) ||
    (scope === 'home' && items.some(item => item.auto));

  // Categorias para o seletor (raiz + subcategorias indentadas)
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.success) setCategories(data.categories as CategoryOption[]);
      })
      .catch(() => {
        /* seletor fica só com "Todos os produtos" */
      });
  }, []);

  const categoryOptions = useMemo(() => {
    const roots = categories.filter(cat => !cat.parent);
    const options: { slug: string; label: string }[] = [];
    for (const root of roots) {
      options.push({ slug: root.slug, label: root.name });
      for (const sub of categories.filter(cat => cat.parent === root._id)) {
        options.push({ slug: sub.slug, label: `— ${sub.name}` });
      }
    }
    return options;
  }, [categories]);

  const load = useCallback(async (nextScope: Scope, nextCategory: string) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ scope: nextScope });
      if (nextScope === 'catalog' && nextCategory) {
        params.set('categorySlug', nextCategory);
      }
      const res = await fetch(`/api/products/reorder?${params}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (requestId !== requestRef.current) return;
      if (!data.success) throw new Error(data.error);
      setItems(data.items);
      setSavedItems(data.items);
      if (typeof data.homeLimit === 'number') setHomeLimit(data.homeLimit);
    } catch (error) {
      if (requestId !== requestRef.current) return;
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Erro ao carregar produtos',
      );
      setItems([]);
      setSavedItems([]);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(scope, categorySlug);
  }, [load, scope, categorySlug]);

  // Aviso ao sair com alterações por salvar
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const confirmDiscard = () =>
    !dirty ||
    window.confirm('Há alterações na ordem que não foram salvas. Descartar?');

  const changeScope = (next: Scope) => {
    if (next === scope || !confirmDiscard()) return;
    setQuery('');
    setResults([]);
    setScope(next);
  };

  const changeCategory = (next: string) => {
    if (next === categorySlug || !confirmDiscard()) return;
    setCategorySlug(next);
  };

  const handleMove = (from: number, to: number) =>
    setItems(current => moveItem(current, from, to));

  const handleRemove = (id: string) =>
    setItems(current => current.filter(item => item._id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/products/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, ids: items.map(item => item._id) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Ordem salva — já está valendo no site');
      await load(scope, categorySlug);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : 'Erro ao salvar a ordem',
      );
    } finally {
      setSaving(false);
    }
  };

  // Home: busca de produtos para adicionar (debounce)
  useEffect(() => {
    if (scope !== 'home') return;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          context: 'admin',
          isActive: 'true',
          search: term,
          limit: '12',
        });
        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setResults(
            (data.products as SearchProduct[]).filter(
              product => product.isMainVariant !== false,
            ),
          );
        }
      } catch {
        /* busca é best-effort */
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, scope]);

  const addProduct = (product: SearchProduct) => {
    setItems(current => {
      if (current.some(item => item._id === product._id)) return current;
      return [
        ...current,
        {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          sku: product.sku || '',
          image: product.images?.[0] || product.thumbnail || '',
          stock: product.stock ?? 0,
          isLive: !!product.isActive && !!product.isPublishedOnline,
          categoryName: product.category?.name || '',
          auto: false,
        },
      ];
    });
    setQuery('');
    setResults([]);
  };

  // Home: só os primeiros N visíveis entram no carrossel
  const beyondLimitIds = useMemo(() => {
    const ids = new Set<string>();
    if (scope !== 'home') return ids;
    let live = 0;
    for (const item of items) {
      if (!item.isLive) continue;
      live += 1;
      if (live > homeLimit) ids.add(item._id);
    }
    return ids;
  }, [items, scope, homeLimit]);

  const inListIds = useMemo(() => new Set(items.map(i => i._id)), [items]);
  const liveCount = items.filter(item => item.isLive).length;

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      active
        ? 'bg-brand text-white'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
    }`;

  return (
    <div className='max-w-3xl'>
      <Link
        href='/admin/produtos'
        className='inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3'
      >
        <ArrowLeft size={16} />
        Produtos
      </Link>

      <h1 className='text-2xl font-bold'>Ordenar produtos</h1>
      <p className='text-sm text-gray-500 mt-1 mb-5'>
        Arraste pelo ícone à esquerda, use as setas, ou escreva o número da
        posição e tecle Enter. Nada muda no site até clicar em Salvar ordem.
      </p>

      {/* Abas */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <button
          type='button'
          onClick={() => changeScope('catalog')}
          className={tabClass(scope === 'catalog')}
        >
          <LayoutGrid size={16} />
          Loja (categorias)
        </button>
        <button
          type='button'
          onClick={() => changeScope('home')}
          className={tabClass(scope === 'home')}
        >
          <Home size={16} />
          Home — carrossel Novidades
        </button>
      </div>

      {/* Controles do escopo */}
      {scope === 'catalog' ? (
        <div className='bg-white border border-gray-200 rounded-lg p-4 mb-4'>
          <label
            htmlFor='order-category'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Categoria
          </label>
          <select
            id='order-category'
            value={categorySlug}
            onChange={event => changeCategory(event.target.value)}
            className='w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand'
          >
            <option value=''>Todos os produtos</option>
            {categoryOptions.map(option => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
          <p className='text-xs text-gray-500 mt-2'>
            A ordem é única para a loja inteira: o que definir numa
            subcategoria vale também na categoria principal e em “Todos os
            produtos”. Produto novo entra sempre no fim da lista.
          </p>
        </div>
      ) : (
        <div className='bg-white border border-gray-200 rounded-lg p-4 mb-4'>
          <label
            htmlFor='order-add'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            Adicionar produto ao carrossel
          </label>
          <div className='relative'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'
            />
            <input
              id='order-add'
              type='search'
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder='Buscar por nome ou SKU…'
              className='w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand'
            />
            {searching && (
              <Loader2
                size={16}
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin'
              />
            )}
          </div>

          {results.length > 0 && (
            <ul className='mt-2 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-72 overflow-y-auto'>
              {results.map(product => {
                const already = inListIds.has(product._id);
                const live = !!product.isActive && !!product.isPublishedOnline;
                return (
                  <li key={product._id}>
                    <button
                      type='button'
                      disabled={already}
                      onClick={() => addProduct(product)}
                      className='w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent'
                    >
                      <Plus size={16} className='text-brand flex-shrink-0' />
                      <span className='min-w-0 flex-1'>
                        <span className='block text-sm text-gray-900 line-clamp-1'>
                          {product.name}
                        </span>
                        <span className='block text-xs text-gray-500'>
                          {product.sku}
                          {already && ' · já está no carrossel'}
                          {!already && !live && ' · fora do site'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className='text-xs text-gray-500 mt-2'>
            O carrossel mostra os {homeLimit} primeiros. Quem está nesta lista
            fica marcado como “Novidade”; ao remover, a marca sai. Com menos de{' '}
            {homeLimit} produtos, o site completa sozinho com os publicados
            mais recentes (aparecem aqui como “automático” — ao salvar, passam
            a ser fixos).
          </p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className='flex items-center justify-center py-16 text-gray-500'>
          <Loader2 size={20} className='animate-spin mr-2' />
          Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className='bg-white border border-dashed border-gray-300 rounded-lg py-12 text-center text-sm text-gray-500'>
          {scope === 'home'
            ? 'Nenhum produto no carrossel. Use a busca acima para adicionar.'
            : 'Nenhum produto nesta categoria.'}
        </div>
      ) : (
        <>
          <p className='text-xs text-gray-500 mb-2'>
            {items.length} produto{items.length !== 1 ? 's' : ''}
            {scope === 'home' && ` · ${liveCount} visíveis no site`}
          </p>
          <Reorder.Group
            axis='y'
            values={items}
            onReorder={setItems}
            className='space-y-2'
          >
            {items.map((item, index) => (
              <OrderRow
                key={item._id}
                item={item}
                index={index}
                total={items.length}
                scope={scope}
                beyondLimit={beyondLimitIds.has(item._id)}
                onMove={handleMove}
                onRemove={handleRemove}
              />
            ))}
          </Reorder.Group>
        </>
      )}

      {/* Barra de salvar (fica colada ao fundo ao rolar) */}
      <div
        className='sticky bottom-0 mt-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center justify-between gap-3'
        style={{ zIndex: 30 }}
      >
        <p className='text-sm text-gray-600'>
          {dirty ? 'Alterações por salvar' : 'Tudo salvo'}
        </p>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            disabled={!dirty || saving}
            onClick={() => setItems(savedItems)}
            className='flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-40'
          >
            <RotateCcw size={16} />
            Desfazer
          </button>
          <button
            type='button'
            disabled={!dirty || saving}
            onClick={handleSave}
            className='flex items-center gap-2 px-4 py-2 text-sm bg-brand text-white rounded-md hover:bg-brand-dark disabled:opacity-40'
          >
            {saving ? (
              <Loader2 size={16} className='animate-spin' />
            ) : (
              <Save size={16} />
            )}
            Salvar ordem
          </button>
        </div>
      </div>
    </div>
  );
}
