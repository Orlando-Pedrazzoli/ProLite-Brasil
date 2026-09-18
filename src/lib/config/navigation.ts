// src/lib/config/navigation.ts
//
// Os DEPARTAMENTOS principais da Navbar são DINÂMICOS: vêm das
// categorias-raiz do MongoDB via /api/catalog. Ao criar uma nova
// categoria-raiz no admin (/admin/categorias) ela aparece
// automaticamente na navbar e nos toggles do ShopByCategory — sem
// editar este ficheiro.
//
// Este ficheiro mantém apenas:
//   • itens ESPECIAIS de navegação que NÃO são categorias da BD
//     (Tarifas Aéreas, Promoção)
//   • uma lista de FALLBACK usada só se o /api/catalog falhar (resiliência)

export interface NavCategory {
  label: string;
  href: string;
  icon?: string;
  highlight?: boolean; // destaque visual na cor da marca (ex.: Promoção)
}

// Itens fixos sempre no FIM da navbar (não são categorias da base de dados).
// A ordem aqui é a ordem em que aparecem, no desktop e no menu mobile.
export const specialNavItems: NavCategory[] = [
  { label: 'Tarifas Aéreas', href: '/tarifas-aereas' },
  { label: 'Promoção', href: '/promocao', highlight: true },
];

// Fallback: usado APENAS se o catálogo não carregar (API em baixo).
// Em funcionamento normal, os departamentos vêm da base de dados, ordenados
// pelo campo `order` de cada categoria-raiz (editável no admin).
// Os slugs devem coincidir com os das categorias-raiz criadas no admin.
export const fallbackCategories: NavCategory[] = [
  { label: 'Capas', href: '/categoria/capas' },
  { label: 'Leashes', href: '/categoria/leashes' },
  { label: 'Decks', href: '/categoria/decks' },
  { label: 'Parafinas', href: '/categoria/parafinas' },
  { label: 'Racks', href: '/categoria/racks' },
  { label: 'Acessórios', href: '/categoria/acessorios' },
];

// Backward-compat: mantido caso algum componente ainda importe mainCategories.
export const mainCategories: NavCategory[] = [
  ...fallbackCategories,
  ...specialNavItems,
];
