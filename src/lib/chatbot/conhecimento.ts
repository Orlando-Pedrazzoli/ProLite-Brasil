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
  {
    pergunta: 'Há quanto tempo existe a Pro-Lite?',
    resposta:
      'A Pro-Lite do Brasil é uma marca tradicional, há mais de 40 anos no mercado brasileiro, e faz produtos de alta qualidade para surfistas.',
  },
  {
    pergunta: 'Como são os zíperes e os cursores das capas?',
    resposta:
      'Os zíperes são de plástico e demoram muito mais a dar problema de oxidação. Os cursores são de alumínio e também resistem muito à oxidação. Os zíperes têm protetor, para o zíper e o cursor não tocarem na prancha.',
  },
  {
    pergunta: 'Como é a costura das capas?',
    resposta:
      'As capas são costuradas com linhas de alta tenacidade, pensadas para sol, chuva, água do mar, areia e arrasto. As máquinas são de última geração, com inteligência artificial, para nenhum ponto ficar solto ou mais frouxo que os outros. Nas alças e nos zíperes há travetes, uma costura com muitos pontos, para não soltarem.',
  },
  {
    pergunta: 'A capa tem assistência técnica?',
    resposta:
      'Sim. Costuras e zíperes têm assistência técnica vitalícia. O cliente envia a capa para a sede da Pro-Lite em São Paulo e depois levanta-a. O envio e a retirada ficam a cargo do cliente. A manutenção da capa é gratuita.',
  },
  {
    pergunta: 'Que pranchas e que modelos de capa existem?',
    resposta:
      'Há capas para shortboard, funboard, longboard, fishtail, evolution, SUP e os outros modelos de prancha. A linha inclui capas acolchoadas, intermediárias e top, e capas para 2, 3, 4, 5 ou mais pranchas. A capa de viagem leva espuma de 10 mm. Os outros modelos usam 8, 6 ou 3 mm, conforme o modelo. Também há a capa acolchoada de conforto: leve, para a prancha não sujar o carro nem a roupa, e não é uma capa de proteção.',
  },
  {
    pergunta: 'Dá para encomendar uma capa com tamanho, várias pranchas ou rodas?',
    resposta:
      'Sim. O cliente fala com a Pro-Lite e informa o tamanho, quantas pranchas quer transportar e se quer rodas ou não. A partir das capas duplas, todas podem ser feitas com ou sem rodas.',
  },
  {
    pergunta: 'A capa protege o bico da prancha?',
    resposta:
      'Sim. O bico tem um reforço especial num plástico rígido.',
  },
  {
    pergunta: 'O que vem dentro da capa se ela rasgar?',
    resposta:
      'Vem um patch repair: um pedaço de cada tecido da capa, para um rasgo. Basta seguir as instruções que estão na capa.',
  },
  {
    pergunta: 'O que é a alça da capa?',
    resposta:
      'A alça é a pega da própria capa, para a mão ou para o ombro, e serve para transportar a capa. Não é o leash da prancha. As alças são reguláveis e, nos pontos de costura, levam travetes para não soltarem.',
  },
  {
    pergunta: 'A capa tem bolsos?',
    resposta:
      'Sim. Tem um bolso para guardar a alça de transporte, outro para a parafina e outro para as quilhas.',
  },
  {
    pergunta: 'A capa é à prova de água?',
    resposta:
      'Os tecidos são impermeáveis. A água só entra pelas costuras. A capa não é vedada, mas resiste bem ao encharcamento.',
  },
  {
    pergunta: 'Qual lado da capa fica para cima no rack?',
    resposta:
      'Um lado é de nylon, pelo design, e é o lado que fica nas mãos. O outro lado é cinza, mais resistente, absorve menos calor e aguenta melhor a chuva. No rack, o lado cinza fica voltado para o céu.',
  },
  {
    pergunta: 'A prancha cabe na capa com as quilhas?',
    resposta:
      'Na grande maioria das capas, sim. A altura permite transportar a prancha com as quilhas.',
  },
];
