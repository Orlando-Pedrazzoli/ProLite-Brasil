// 📄 src/lib/chatbot/conhecimento.ts
// Respostas fixas do dono da Pro-Lite. O assistente usa esta lista antes
// do FAQ público. Para acrescentar uma, copie um bloco { pergunta, resposta }.
//
// Não coloque aqui preço, stock nem estado de encomenda: isso muda e o
// assistente consulta o catálogo e a conta de quem está logado.
import { company, getFormattedAddress } from '@/lib/config/company';

export const conhecimento: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'A Pro-Lite vende outras marcas?',
    resposta:
      'Não. A loja vende só produtos Pro-Lite: capas, leashes, decks, quilhas e acessórios da própria marca. Não revendemos outras marcas.',
  },
  {
    pergunta: 'Onde os produtos são fabricados?',
    resposta:
      'A Pro-Lite é fabricada em São Paulo pela Maos Acessórios. É fabricação própria, não uma loja de várias marcas. O Maurício é o dono.',
  },
  {
    pergunta: 'Qual o horário de atendimento e de retirada?',
    resposta: `${company.businessHours}, horário de Brasília. Fora desse horário o assistente do site continua a responder, mas uma pessoa só atende no WhatsApp dentro do horário.`,
  },
  {
    pergunta: 'Como falo com uma pessoa?',
    resposta: `Pelo botão verde do WhatsApp, no número ${company.whatsappDisplay}, ou pelo e-mail ${company.email}. Esse WhatsApp não é automático: quem responde é a equipe.`,
  },
  {
    pergunta: 'Como consulto a minha encomenda neste chat?',
    resposta:
      'Só se estiver logado na conta em que a compra foi feita. Sem login, o assistente não consulta encomenda, nem por e-mail nem por número de pedido.',
  },
  {
    pergunta: 'Tem frete grátis?',
    resposta: `Frete grátis a partir de R$ ${company.shipping.freeShippingMinValue}, na opção de envio mais barata. O valor e o prazo de um CEP só são confirmados no cálculo de frete, não de memória.`,
  },
  {
    pergunta: 'Qual o desconto no Pix e no boleto?',
    resposta: `Pix e boleto à vista têm ${company.payment.pixDiscountPercent}% de desconto. Não há outro desconto, cupom ou exceção combinados por este chat.`,
  },
  {
    pergunta: 'Dá para parcelar?',
    resposta: `No cartão de crédito, em até ${company.payment.maxInstallments}x, com parcela mínima de R$ ${company.payment.minInstallmentValue}.`,
  },
  {
    pergunta: 'Posso retirar o pedido na loja?',
    resposta: `Sim. No checkout, escolha a retirada na sede, sem custo de frete: ${getFormattedAddress()}.`,
  },
  {
    pergunta: 'Onde encontro a Pro-Lite no Instagram e no YouTube?',
    resposta: `Instagram: ${company.social.instagram} YouTube: ${company.social.youtube}`,
  },
];
