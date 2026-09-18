// src/lib/config/airlineFees.ts
// ============================================================
// TARIFAS AÉREAS PARA PRANCHAS — fonte única de dados da página
// /tarifas-aereas. Para atualizar a página, editar SÓ este ficheiro.
//
// REGRA DE OURO: só preencher `fee` com valor confirmado NA FONTE
// OFICIAL da companhia, e atualizar `verifiedAt` no mesmo momento.
// Valor sem confirmação = não publicar (deixar `fee` de fora). A página
// mostra "Confirme o valor no site oficial" automaticamente.
//
// Porquê: as tarifas mudam sem aviso e a internet está cheia de valores
// antigos e contraditórios. Um número errado aqui vira um cliente
// surpreendido no balcão do aeroporto com a marca Pro-Lite na cabeça.
// ============================================================

export type AirlineScope = 'nacional' | 'internacional';

export interface AirlineFee {
  id: string;
  name: string;
  scope: AirlineScope;
  /** Como a companhia classifica a prancha (define o modelo de cobrança). */
  classification?: string;
  /** Só preencher quando confirmado na fonte oficial. */
  fee?: {
    value: string;
    detail?: string;
  };
  /** Regras práticas: pranchas por capa, dimensões, peso, antecedência. */
  rules: string[];
  /** Página oficial de bagagem da companhia (ou domínio oficial). */
  officialUrl: string;
  /** Data (AAAA-MM-DD) da última conferência na fonte oficial. */
  verifiedAt?: string;
}

/** Data da última revisão geral da página (AAAA-MM-DD). */
export const AIRLINE_FEES_LAST_REVIEW = '2026-09-18';

export const airlineFees: AirlineFee[] = [
  // ── NACIONAIS ──────────────────────────────────────────────
  {
    id: 'latam',
    name: 'LATAM',
    scope: 'nacional',
    classification: 'Bagagem especial, com valor fixo que depende da rota',
    rules: [
      'Uma capa com no máximo 3 pranchas.',
      'Volumes acima de 300 cm lineares não embarcam como bagagem: só via LATAM Cargo.',
      'O valor não está incluído na franquia de bagagem da tarifa.',
    ],
    officialUrl:
      'https://www.latamairlines.com/br/pt/experiencia/prepare-sua-viagem/bagagem/bagagem-especial',
    verifiedAt: '2026-09-18',
    // A CONFIRMAR (valor): a tabela oficial é carregada por JavaScript.
    // Abrir o link acima, ler o valor doméstico Brasil e preencher `fee`.
  },
  {
    id: 'gol',
    name: 'GOL',
    scope: 'nacional',
    classification: 'Bagagem diferenciada, cobrada à parte da franquia',
    rules: [
      'Até 3 pranchas por capa; acima disso, é preciso outra capa e outra tarifa.',
      'Peso até 23 kg por volume; acima disso há cobrança de excesso.',
      'Dimensão máxima de 292 cm (altura + largura + comprimento).',
    ],
    officialUrl: 'https://www.voegol.com.br',
    // A CONFIRMAR (regras e valor): regras obtidas em fontes secundárias
    // de 2025/2026. Conferir no site da GOL e então preencher verifiedAt.
  },
  {
    id: 'azul',
    name: 'Azul',
    scope: 'nacional',
    classification: 'Bagagem especial, com taxa de serviço por volume',
    rules: [
      'Uma bolsa com no máximo 3 pranchas.',
      'Comprimento máximo de 320 cm; em voos operados com ATR, 275 cm.',
      'A compra costuma ser feita no aeroporto, não pelo site ou app.',
    ],
    officialUrl: 'https://www.voeazul.com.br',
    // A CONFIRMAR (regras e valor): limite de comprimento vem de fonte
    // antiga. Conferir no site da Azul e então preencher verifiedAt.
  },

  // ── INTERNACIONAIS ─────────────────────────────────────────
  {
    id: 'avianca',
    name: 'Avianca',
    scope: 'internacional',
    classification: 'Equipamento esportivo, com tarifa por região e temporada',
    fee: {
      value: 'A partir de USD 120 por trecho',
      detail:
        'Entre América do Sul, América Central, Caribe e México: a partir de USD 120 (baixa temporada) ou USD 145 (alta). De/para a América do Norte: a partir de USD 150 ou USD 175. A partir da Europa: a partir de 150 ou 160 (USD/EUR/GBP).',
    },
    rules: [
      'Adicione a prancha na compra da passagem ou em "Gerenciar reserva" até 48 horas antes do voo.',
      'Também é possível contratar no balcão do aeroporto no dia da viagem.',
    ],
    officialUrl:
      'https://ayuda.avianca.com/hc/en-us/articles/13082634010139-Can-I-bring-my-sports-equipment',
    verifiedAt: '2026-09-18',
  },

  // Companhias ainda sem dados conferidos: aparecem na lista compacta
  // "Outras companhias". Ao conferir, acrescentar classification/rules/
  // fee/verifiedAt e o cartão completo passa a ser mostrado sozinho.
  {
    id: 'tap',
    name: 'TAP Air Portugal',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.flytap.com',
  },
  {
    id: 'copa',
    name: 'Copa Airlines',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.copaair.com',
  },
  {
    id: 'american',
    name: 'American Airlines',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.aa.com',
  },
  {
    id: 'united',
    name: 'United',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.united.com',
  },
  {
    id: 'delta',
    name: 'Delta',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.delta.com',
  },
  {
    id: 'iberia',
    name: 'Iberia',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.iberia.com',
  },
  {
    id: 'airfrance',
    name: 'Air France',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.airfrance.com.br',
  },
  {
    id: 'emirates',
    name: 'Emirates',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.emirates.com',
  },
  {
    id: 'qatar',
    name: 'Qatar Airways',
    scope: 'internacional',
    rules: [],
    officialUrl: 'https://www.qatarairways.com',
  },
];
