// src/lib/content/faq.ts
// ❓ Conteúdo do FAQ — fonte única usada pela página (/faq) E pelo JSON-LD
// FAQPage (rich result no Google). Ficheiro sem JSX para poder ser importado
// em server components; os ícones são chaves mapeadas no FaqPageClient.
// Textos dinâmicos (WhatsApp, morada, horário) vêm de company.ts.

import { company, getFormattedAddress } from '@/lib/config/company';

export interface FAQItem {
  question: string;
  answer: string;
}

export type FAQIcon =
  | 'cart'
  | 'truck'
  | 'credit-card'
  | 'rotate'
  | 'shield'
  | 'help';

export interface FAQCategory {
  title: string;
  icon: FAQIcon;
  items: FAQItem[];
}

export const faqData: FAQCategory[] = [
  {
    title: 'Compras e Pedidos',
    icon: 'cart',
    items: [
      {
        question: 'Como faço para comprar na Pro-Lite?',
        answer:
          'É muito simples! Navegue pelo nosso catálogo, escolha os produtos desejados, adicione ao carrinho e finalize a compra preenchendo seus dados de entrega e pagamento. Você pode comprar como visitante ou criar uma conta para acompanhar seus pedidos.',
      },
      {
        question: 'Preciso criar uma conta para comprar?',
        answer:
          'Não é obrigatório, mas recomendamos criar uma conta para acompanhar o status dos seus pedidos, salvar endereços de entrega e ter acesso ao histórico de compras.',
      },
      {
        question: 'Como acompanho o status do meu pedido?',
        answer:
          'Após a confirmação do pagamento, você receberá um e-mail com os detalhes do pedido. Também pode acompanhar o status acessando "Meus Pedidos" no site e fazendo login na sua conta.',
      },
      {
        question: 'Os produtos são originais?',
        answer:
          'Sim! Os produtos Pro-Lite são desenvolvidos e fabricados pela Mãos Acessórios em São Paulo, com procedência garantida. Vendemos sempre com nota fiscal e garantia.',
      },
      {
        question: 'Posso alterar ou cancelar um pedido depois de feito?',
        answer: `Se o pedido ainda não foi expedido, entre em contato conosco pelo WhatsApp ${company.whatsappDisplay} o mais rápido possível e faremos o possível para atender sua solicitação. Após a expedição, será necessário seguir o processo de troca ou devolução.`,
      },
      {
        question: 'Os produtos do site estão em estoque?',
        answer:
          'Sim! Os produtos disponíveis para compra no site estão em nosso estoque em São Paulo e são despachados após a confirmação do pagamento.',
      },
    ],
  },
  {
    title: 'Entregas e Frete',
    icon: 'truck',
    items: [
      {
        question: 'Vocês entregam em todo o Brasil?',
        answer:
          'Sim! Entregamos em todo o território nacional através das melhores e mais seguras transportadoras do mercado.',
      },
      {
        question: 'Qual o prazo de entrega?',
        answer:
          'O prazo varia conforme a região: São Paulo Capital (1 a 3 dias úteis), Sudeste e Sul (3 a 7 dias úteis), Nordeste e Centro-Oeste (5 a 10 dias úteis), Norte (7 a 15 dias úteis). O prazo começa a contar após a confirmação do pagamento.',
      },
      {
        question: 'Como funciona o frete grátis?',
        answer:
          'Oferecemos frete grátis em compras a partir de R$ 200,00 para Sul e Sudeste, e acima de R$ 300,00 para Norte, Nordeste e Centro-Oeste. Exceção: pranchas de surf possuem frete diferenciado devido ao tamanho.',
      },
      {
        question: 'Como calculo o frete?',
        answer:
          'Na página do produto ou no carrinho de compras, insira o seu CEP para consultar as opções de frete disponíveis, prazos e valores antes de finalizar a compra.',
      },
      {
        question: 'As entregas são feitas nos fins de semana?',
        answer:
          'Não. As entregas são realizadas de segunda a sexta-feira, em horário comercial, entre 8h e 18h.',
      },
      {
        question: 'Outra pessoa pode receber meu pedido?',
        answer:
          'Sim! O recebimento pode ser feito por terceiros (porteiros, familiares, etc.), desde que assinem o comprovante de recebimento da mercadoria.',
      },
    ],
  },
  {
    title: 'Pagamento',
    icon: 'credit-card',
    items: [
      {
        question: 'Quais formas de pagamento vocês aceitam?',
        answer:
          'Aceitamos cartão de crédito (Visa, Mastercard, Amex, Elo, Diners, JCB, Discover, Hipercard), PIX e boleto bancário.',
      },
      {
        question: 'Posso parcelar no cartão de crédito?',
        answer:
          'Sim! Parcelamos em até 10x sem juros no cartão de crédito, com parcela mínima de R$ 30,00.',
      },
      {
        question: 'Existe desconto para pagamento à vista?',
        answer:
          'Sim! Pagamentos via PIX ou boleto bancário possuem 10% de desconto sobre o valor total do pedido.',
      },
      {
        question: 'O pagamento no site é seguro?',
        answer:
          'Totalmente seguro! Todas as transações são processadas pela Pagar.me, uma das maiores empresas de meios de pagamento do Brasil. Nosso site possui certificado SSL e não armazenamos dados de cartão de crédito em nossos servidores.',
      },
      {
        question: 'Paguei com boleto, quando meu pedido será enviado?',
        answer:
          'Pedidos pagos via boleto são processados após a compensação bancária, que pode levar até 3 dias úteis. Após a compensação, o prazo de entrega começa a contar.',
      },
    ],
  },
  {
    title: 'Trocas e Devoluções',
    icon: 'rotate',
    items: [
      {
        question: 'Posso trocar ou devolver um produto?',
        answer:
          'Sim! Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução, desde que o produto esteja em sua embalagem original, sem sinais de uso e acompanhado da nota fiscal.',
      },
      {
        question: 'Comprei o tamanho errado, posso trocar?',
        answer:
          'Sim! Damos total liberdade de troca por erro de tamanho. Nenhum valor adicional é cobrado pela troca, porém os custos de frete de envio e retorno são de responsabilidade do cliente.',
      },
      {
        question: 'Recebi um produto com defeito, o que faço?',
        answer:
          'Entre em contato com nossa central de atendimento em até 7 dias. O produto será substituído por um novo idêntico, sem qualquer custo adicional. Caso não haja em estoque, oferecemos troca por similar ou reembolso integral.',
      },
      {
        question: 'Quanto tempo demora o reembolso?',
        answer:
          'O reembolso é processado em até 3 dias úteis após o recebimento e análise do produto. Para cartão de crédito, o estorno segue as regras da administradora. Para PIX e boleto, o valor é devolvido na conta informada pelo cliente.',
      },
      {
        question: 'Os produtos têm garantia?',
        answer:
          'Sim! Todos os produtos possuem no mínimo 3 meses de garantia legal contra defeitos de fabricação. Algumas marcas oferecem garantia estendida — cada caso é analisado individualmente.',
      },
    ],
  },
  {
    title: 'Segurança e Privacidade',
    icon: 'shield',
    items: [
      {
        question: 'Meus dados estão seguros?',
        answer:
          'Sim! Seguimos a Lei Geral de Proteção de Dados (LGPD) e seus dados pessoais não são compartilhados com terceiros. Utilizamos criptografia SSL em todo o site.',
      },
      {
        question: 'Vocês armazenam dados do meu cartão?',
        answer:
          'Não! Os dados do cartão de crédito são processados diretamente pela Pagar.me e nunca passam pelos nossos servidores.',
      },
      {
        question: 'Vocês enviam spam?',
        answer:
          'Não! Só enviamos e-mails com sua autorização prévia. Você pode cancelar o recebimento de newsletters a qualquer momento.',
      },
    ],
  },
  {
    title: 'Sobre a Loja',
    icon: 'help',
    items: [
      {
        question: 'Posso retirar meu pedido pessoalmente?',
        answer: `Sim! No checkout, escolha a opção de retirada e busque seu pedido sem custo de frete na nossa sede: ${getFormattedAddress()}.`,
      },
      {
        question: 'Qual o horário de funcionamento?',
        answer: `${company.businessHours}.`,
      },
      {
        question: 'Como entro em contato com vocês?',
        answer: `Você pode nos contatar pelo WhatsApp ${company.whatsappDisplay}, pelo e-mail ${company.email} ou pelo formulário da página Fale Conosco.`,
      },
      {
        question: 'Há quanto tempo a Pro-Lite existe?',
        answer:
          'A marca Pro-Lite foi registrada no Brasil em 1984 e há 40 anos projeta e constrói equipamentos de surf. Hoje pertence à Mãos Acessórios, empresa paulistana fundada em 2000 e aprovada com Selo Ouro no Programa ABVTEX.',
      },
    ],
  },
];

/** Lista plana (pergunta/resposta) para o schema FAQPage. */
export const faqEntries: FAQItem[] = faqData.flatMap(c => c.items);
