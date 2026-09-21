// 📄 src/lib/config/company.ts
// Fonte única dos dados da empresa. A marca Pro-Lite pertence à
// MAOS Confecção, Comércio, Importação e Exportação de Acessórios Ltda.
// (Mãos Acessórios). Tudo o que é dado de empresa no site (footer,
// contato, páginas institucionais, checkout, cupom, e-mails) lê daqui.
export const company = {
  name: 'Pro-Lite',
  tradeName: 'Mãos Acessórios',
  legalName:
    'MAOS Confecção, Comércio, Importação e Exportação de Acessórios Ltda.',
  slogan: '40 anos projetando e construindo os melhores equipamentos de surf',
  cnpj: '03.611.941/0001-50',
  ie: '115.626.480.115',
  email: 'atendimento@maosacessorios.com.br',
  // ⚠️ CONFIRMAR COM O MAURÍCIO: telefone fixo do cadastro da Receita e
  // celular/WhatsApp listado no Reclame Aqui da Mãos Acessórios.
  phone: '(11) 2294-6300',
  whatsappDisplay: '(11) 96243-5701',
  whatsapp: '5511962435701',
  address: {
    street: 'Rua Dom Andrés Lamas',
    number: '57',
    complement: '',
    neighborhood: 'Tatuapé',
    city: 'São Paulo',
    state: 'SP',
    cep: '03084-020',
  },
  // Deixar vazio enquanto não houver perfil oficial confirmado:
  // os componentes escondem o ícone quando a URL está vazia.
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
  },
  // ⚠️ CONFIRMAR COM O MAURÍCIO o horário de atendimento/retirada.
  businessHours: 'Seg a Sex: 9h às 18h | Sáb e Dom: Fechado',
  url: 'https://prolite.com.br',
  orderPrefix: 'PL',
  // Selo de qualidade — Programa ABVTEX (auditoria independente de
  // conformidade social, ambiental e trabalhista na cadeia de moda).
  certification: {
    abvtex: {
      level: 'Ouro',
      label: 'Selo Ouro ABVTEX',
      program: 'Programa ABVTEX',
      memberSince: 2020,
      url: 'https://www.abvtex.org.br',
    },
  },
  payment: {
    maxInstallments: 10,
    minInstallmentValue: 30,
    pixDiscountPercent: 10,
    boletoDiscountPercent: 10,
  },
  shipping: {
    freeShippingMinValue: 399,
    originCep: '03084-020',
  },
} as const;

/** Número de WhatsApp formatado para exibição. */
export const whatsappDisplay = company.whatsappDisplay;

/** Link do WhatsApp com mensagem opcional. */
export function getWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${company.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Endereço formatado em linha única
 * Ex: "Rua Dom Andrés Lamas, 57 · Tatuapé · São Paulo - SP · CEP 03084-020"
 */
export function getFormattedAddress(): string {
  const a = company.address;
  const parts: string[] = [];
  if (a.street && a.number) {
    parts.push(
      `${a.street}, ${a.number}${a.complement ? ` · ${a.complement}` : ''}`,
    );
  }
  if (a.neighborhood) parts.push(a.neighborhood);
  if (a.city && a.state) parts.push(`${a.city} - ${a.state}`);
  if (a.cep) parts.push(`CEP ${a.cep}`);
  return parts.join(' · ');
}
/**
 * Endereço curto (para cupom térmica 80mm)
 * Ex: "Tatuapé · São Paulo - SP"
 */
export function getShortAddress(): string {
  const a = company.address;
  const parts: string[] = [];
  if (a.neighborhood) parts.push(a.neighborhood);
  if (a.city && a.state) parts.push(`${a.city} - ${a.state}`);
  return parts.join(' · ');
}
