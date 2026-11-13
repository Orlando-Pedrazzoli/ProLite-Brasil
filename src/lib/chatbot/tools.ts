// 📄 src/lib/chatbot/tools.ts
// Ferramentas que o assistente virtual pode chamar. Cada uma devolve só o
// que pode ser dito a um cliente: nunca preço de custo, CPF, endereço ou
// telefone.
import connectDB from '@/lib/db/connect';
import Product from '@/lib/models/Product';
import Category from '@/lib/models/Category';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';
import { company } from '@/lib/config/company';
import { SITE_URL } from '@/lib/seo/config';
import {
  calculateShipping,
  normalizeWeightKg,
} from '@/lib/services/melhorEnvio';
import { handoffToHuman } from '@/lib/chatbot/chatwoot';
import type { FunctionTool } from '@/lib/chatbot/gemini';

// Páginas institucionais que o assistente pode ler na hora (fonte única:
// o próprio site, para o texto nunca ficar desatualizado em relação a ele).
const POLICY_PAGES = {
  prazos_entrega: '/prazos-entrega',
  trocas_devolucoes: '/trocas-devolucoes',
  formas_pagamento: '/formas-pagamento',
  revendedores: '/revendedores',
  tarifas_aereas: '/tarifas-aereas',
  a_empresa: '/a-empresa',
} as const;

type PolicyTopic = keyof typeof POLICY_PAGES;

export const TOOLS: FunctionTool[] = [
  {
    type: 'function',
    name: 'buscar_produtos',
    description:
      'Procura produtos do catálogo da Pro-Lite por texto e/ou categoria. Devolve nome, preço, disponibilidade, cor, tamanho, descrição e link. Use sempre que o cliente perguntar por um produto, preço, modelo, tamanho ou disponibilidade.',
    parameters: {
      type: 'object',
      properties: {
        termo: {
          type: 'string',
          description:
            'Palavras-chave do produto, ex.: "capa 6\'0", "leash 7 pés", "deck". Pode ficar vazio se informar a categoria.',
        },
        categoria: {
          type: 'string',
          enum: ['capas', 'leashes', 'decks', 'quilhas', 'acessorios'],
          description: 'Categoria-raiz para filtrar (opcional).',
        },
      },
    },
  },
  {
    type: 'function',
    name: 'calcular_frete',
    description:
      'Calcula o valor e o prazo do frete para um CEP. Se o cliente indicar um produto, informe o slug dele (vem de buscar_produtos) para usar o peso e as dimensões reais.',
    parameters: {
      type: 'object',
      properties: {
        cep: { type: 'string', description: 'CEP de destino, 8 dígitos.' },
        produto_slug: {
          type: 'string',
          description: 'Slug do produto (opcional).',
        },
        quantidade: {
          type: 'integer',
          description: 'Quantidade do produto (padrão 1).',
        },
      },
      required: ['cep'],
    },
  },
  {
    type: 'function',
    name: 'consultar_pedido',
    description:
      'Consulta o estado de um pedido. Exige o número do pedido E o e-mail usado na compra; só devolve dados se os dois conferirem.',
    parameters: {
      type: 'object',
      properties: {
        numero_pedido: {
          type: 'string',
          description: 'Número do pedido, ex.: WEB261113-1234.',
        },
        email: {
          type: 'string',
          description: 'E-mail usado na compra.',
        },
      },
      required: ['numero_pedido', 'email'],
    },
  },
  {
    type: 'function',
    name: 'consultar_politica',
    description:
      'Lê a página oficial do site sobre um tema (prazos de entrega, trocas e devoluções, formas de pagamento, programa de revendedores, tarifas aéreas para pranchas, a empresa). Use antes de responder sobre regras e condições.',
    parameters: {
      type: 'object',
      properties: {
        tema: { type: 'string', enum: Object.keys(POLICY_PAGES) },
      },
      required: ['tema'],
    },
  },
  {
    type: 'function',
    name: 'transferir_para_humano',
    description:
      'Passa a conversa para a equipe humana da Pro-Lite. Use quando o cliente pedir para falar com uma pessoa, quando houver reclamação, pedido de cancelamento, troca, reembolso ou alteração de pedido, ou quando você não souber responder.',
    parameters: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Resumo curto do que o cliente precisa.',
        },
      },
      required: ['motivo'],
    },
  },
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const money = (n: number) => Math.round(n * 100) / 100;
const truncate = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;

// ─────────────────────────────────────────────
// Produtos
// ─────────────────────────────────────────────

async function buscarProdutos(args: Record<string, unknown>) {
  const termo = str(args.termo);
  const categoria = str(args.categoria).toLowerCase();
  if (!termo && !categoria) {
    return { erro: 'Informe um termo de busca ou uma categoria.' };
  }

  await connectDB();
  const filter: Record<string, unknown> = {
    isActive: true,
    isPublishedOnline: true,
  };

  if (categoria) {
    const root = await Category.findOne({ slug: categoria })
      .select('_id')
      .lean();
    if (root) {
      const children = await Category.find({ parent: root._id })
        .select('_id')
        .lean();
      const ids = [root._id, ...children.map(c => c._id)];
      filter.$or = [{ category: { $in: ids } }, { subcategory: { $in: ids } }];
    }
  }

  // Cada palavra tem de aparecer em algum dos campos pesquisáveis
  const words = termo.split(/\s+/).filter(Boolean).slice(0, 6);
  if (words.length > 0) {
    filter.$and = words.map(w => {
      const rx = { $regex: escapeRegex(w), $options: 'i' };
      return {
        $or: [
          { name: rx },
          { tags: rx },
          { description: rx },
          { color: rx },
          { size: rx },
          { sku: rx },
        ],
      };
    });
  }

  const products = await Product.find(filter)
    .select(
      'name slug price compareAtPrice stock color size description specifications',
    )
    .sort({ sortOrder: 1 })
    .limit(6)
    .lean();

  if (products.length === 0) {
    return {
      produtos: [],
      nota: 'Nenhum produto encontrado. Tente outras palavras ou sugira ver o catálogo em ' +
        `${SITE_URL}/produtos`,
    };
  }

  return {
    produtos: products.map(p => ({
      nome: p.name,
      slug: p.slug,
      preco: money(p.price),
      ...(p.compareAtPrice && p.compareAtPrice > p.price
        ? { preco_anterior: money(p.compareAtPrice) }
        : {}),
      disponivel: p.stock > 0,
      ...(p.color ? { cor: p.color } : {}),
      ...(p.size ? { tamanho: p.size } : {}),
      descricao: truncate(p.description ?? '', 400),
      especificacoes: (p.specifications ?? [])
        .filter(s => s.key && s.value)
        .slice(0, 8)
        .map(s => `${s.key}: ${s.value}`),
      link: `${SITE_URL}/produtos/${p.slug}`,
    })),
  };
}

// ─────────────────────────────────────────────
// Frete
// ─────────────────────────────────────────────

// Mesmo pacote padrão da rota /api/shipping/calculate (produto sem dimensões)
const DEFAULT_PACKAGE = { weight: 0.5, height: 10, width: 20, length: 30 };

async function calcularFrete(args: Record<string, unknown>) {
  const cep = str(args.cep).replace(/\D/g, '');
  if (cep.length !== 8) return { erro: 'CEP inválido: precisa de 8 dígitos.' };

  const slug = str(args.produto_slug);
  const qty = Math.min(Math.max(Number(args.quantidade) || 1, 1), 20);

  let pkg = { ...DEFAULT_PACKAGE, insuranceValue: 0 };
  let produto: string | undefined;
  let subtotal = 0;

  if (slug) {
    await connectDB();
    const p = await Product.findOne({
      slug,
      isActive: true,
      isPublishedOnline: true,
    })
      .select('name price weight dimensions')
      .lean();
    if (p) {
      produto = p.name;
      subtotal = p.price * qty;
      const weightKg = p.weight
        ? normalizeWeightKg(p.weight)
        : DEFAULT_PACKAGE.weight;
      pkg = {
        weight: Math.max(weightKg * qty, 0.05),
        height: Math.min(
          Math.max((p.dimensions?.height || DEFAULT_PACKAGE.height) * qty, 2),
          100,
        ),
        width: Math.max(p.dimensions?.width || DEFAULT_PACKAGE.width, 11),
        length: Math.max(p.dimensions?.length || DEFAULT_PACKAGE.length, 16),
        insuranceValue: subtotal,
      };
    }
  }

  const quotes = await calculateShipping({
    cepDestino: cep,
    weight: pkg.weight,
    height: pkg.height,
    width: pkg.width,
    length: pkg.length,
    insuranceValue: pkg.insuranceValue,
  });
  if (quotes.length === 0) {
    return { erro: 'Nenhuma transportadora disponível para este CEP.' };
  }

  // Regra do site: a partir do valor mínimo, a opção mais barata sai grátis
  const minFree = company.shipping.freeShippingMinValue;
  const freeShipping = subtotal >= minFree;

  return {
    cep,
    ...(produto ? { produto, quantidade: qty } : {}),
    opcoes: quotes.slice(0, 4).map((q, i) => ({
      servico: `${q.company} ${q.name}`,
      valor: freeShipping && i === 0 ? 0 : money(q.price),
      prazo_dias_uteis: q.deliveryDays,
    })),
    frete_gratis_a_partir_de: minFree,
    nota: produto
      ? 'Valores para este produto. O valor final é confirmado no carrinho.'
      : 'Estimativa para um pacote pequeno padrão; o valor exato depende dos produtos e é confirmado no carrinho.',
  };
}

// ─────────────────────────────────────────────
// Pedidos
// ─────────────────────────────────────────────

const ORDER_STATUS: Record<string, string> = {
  pending: 'aguardando pagamento',
  confirmed: 'pagamento confirmado',
  processing: 'em separação',
  shipped: 'enviado',
  delivered: 'entregue',
  cancelled: 'cancelado',
};

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'pendente',
  paid: 'pago',
  failed: 'não aprovado',
  refunded: 'estornado',
};

const PAYMENT_METHOD: Record<string, string> = {
  credit_card: 'cartão de crédito',
  debit_card: 'cartão de débito',
  boleto: 'boleto',
  pix: 'Pix',
  cash: 'dinheiro',
};

const dateBR = (d?: Date) =>
  d
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
      }).format(new Date(d))
    : undefined;

async function consultarPedido(args: Record<string, unknown>) {
  const numero = str(args.numero_pedido).replace(/^#/, '').toUpperCase();
  const email = str(args.email).toLowerCase();
  // Resposta única para "não existe" e "e-mail não confere": não revela
  // a terceiros se um número de pedido é válido.
  const notFound = {
    erro: 'Não encontrei um pedido com esse número e esse e-mail. Peça ao cliente para conferir os dois dados.',
  };
  if (!numero || !email.includes('@')) return notFound;

  await connectDB();
  const order = await Order.findOne({ orderNumber: numero }).lean();
  if (!order) return notFound;

  const emails = new Set<string>();
  if (order.customerSnapshot?.email) emails.add(order.customerSnapshot.email);
  if (order.guestEmail) emails.add(order.guestEmail);
  if (order.user) {
    const user = await User.findById(order.user).select('email').lean();
    if (user?.email) emails.add(user.email);
  }
  const matches = [...emails].some(e => e.trim().toLowerCase() === email);
  if (!matches) return notFound;

  return {
    numero: order.orderNumber,
    data: dateBR(order.createdAt),
    estado: ORDER_STATUS[order.status] ?? order.status,
    pagamento: {
      forma: PAYMENT_METHOD[order.payment.method] ?? order.payment.method,
      estado: PAYMENT_STATUS[order.payment.status] ?? order.payment.status,
    },
    itens: order.items.map(i => ({
      nome: i.name,
      ...(i.variant ? { variante: i.variant } : {}),
      quantidade: i.quantity,
    })),
    total: money(order.total),
    ...(order.shipping
      ? {
          envio: {
            ...(order.shipping.carrier || order.shipping.method
              ? {
                  servico: [order.shipping.carrier, order.shipping.method]
                    .filter(Boolean)
                    .join(' '),
                }
              : {}),
            ...(order.shipping.trackingCode
              ? { codigo_rastreio: order.shipping.trackingCode }
              : {}),
            ...(order.shipping.shippedAt
              ? { enviado_em: dateBR(order.shipping.shippedAt) }
              : {}),
            ...(order.shipping.deliveredAt
              ? { entregue_em: dateBR(order.shipping.deliveredAt) }
              : {}),
          },
        }
      : {}),
    ...(order.status === 'cancelled' && order.cancelledAt
      ? { cancelado_em: dateBR(order.cancelledAt) }
      : {}),
  };
}

// ─────────────────────────────────────────────
// Páginas institucionais
// ─────────────────────────────────────────────

const policyCache = new Map<PolicyTopic, { text: string; at: number }>();
const POLICY_TTL_MS = 60 * 60 * 1000;

function htmlToText(html: string): string {
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  return main
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

async function consultarPolitica(args: Record<string, unknown>) {
  const tema = str(args.tema) as PolicyTopic;
  const path = POLICY_PAGES[tema];
  if (!path) return { erro: 'Tema desconhecido.' };

  const cached = policyCache.get(tema);
  if (cached && Date.now() - cached.at < POLICY_TTL_MS) {
    return { fonte: `${SITE_URL}${path}`, texto: cached.text };
  }

  const res = await fetch(`${SITE_URL}${path}`, {
    headers: { 'User-Agent': 'ProLite-Chatbot' },
  });
  if (!res.ok) throw new Error(`Página ${path} → ${res.status}`);
  const text = truncate(htmlToText(await res.text()), 7000);
  policyCache.set(tema, { text, at: Date.now() });
  return { fonte: `${SITE_URL}${path}`, texto: text };
}

// ─────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────

export interface ToolContext {
  conversationId: number;
  /** Fica true quando a conversa foi passada para a equipe humana. */
  handedOff: boolean;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case 'buscar_produtos':
      return buscarProdutos(args);
    case 'calcular_frete':
      return calcularFrete(args);
    case 'consultar_pedido':
      return consultarPedido(args);
    case 'consultar_politica':
      return consultarPolitica(args);
    case 'transferir_para_humano':
      await handoffToHuman(ctx.conversationId);
      ctx.handedOff = true;
      return {
        ok: true,
        instrucao: `Avise o cliente de que a conversa foi passada para a equipe e que o atendimento humano funciona ${company.businessHours}.`,
      };
    default:
      return { erro: `Ferramenta desconhecida: ${name}` };
  }
}
