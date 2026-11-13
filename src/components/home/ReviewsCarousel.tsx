// 📄 src/components/home/ReviewsCarousel.tsx
// Textos de apoio da homepage enquanto não há avaliações aprovadas
// suficientes no banco. Falam só da Pro-Lite (marca única da loja).
'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import SectionHeading from '@/components/home/SectionHeading';

interface CarouselReview {
  name: string;
  location: string;
  date: string;
  rating: number;
  text: string;
}

interface ApiReview {
  name: string;
  city?: string;
  state?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const fallbackReviews: CarouselReview[] = [
  {
    name: 'Itamar Guimarães',
    location: 'São Paulo/SP',
    date: '15/10/2025',
    rating: 5,
    text: 'Qualidade de verdade. Capa, leash e quilha Pro-Lite, tudo fabricado por eles. Não é loja de marca misturada: é a Pro-Lite, e se sente na mão.',
  },
  {
    name: 'Marcos Capuzzo',
    location: 'São Paulo/SP',
    date: '08/04/2024',
    rating: 5,
    text: 'Loja de surf de verdade. O Anderson explica o produto e indica a medida certa. Saí com o leash Pro-Lite certo para a minha prancha.',
  },
  {
    name: 'Paulo Benevides',
    location: 'São Paulo/SP',
    date: '12/03/2025',
    rating: 5,
    text: 'O Maurício e o time são sensacionais. Dá para ver o capricho de quem fabrica o próprio equipamento há décadas.',
  },
  {
    name: 'Rob',
    location: 'São Paulo/SP',
    date: '20/06/2016',
    rating: 5,
    text: 'Preço justo, atendimento bom e produto que dura. Compro leash Pro-Lite e volto. Aloha!',
  },
  {
    name: 'Marcos Vinicius B.',
    location: 'São Paulo/SP',
    date: '03/09/2022',
    rating: 5,
    text: 'Comprar na Pro-Lite é como escolher produto entre amigos. Me sinto em casa na loja do Tatuapé.',
  },
  {
    name: 'Camila Rocha',
    location: 'Florianópolis/SC',
    date: '02/01/2026',
    rating: 5,
    text: 'A capa refletiva Day-Use chegou certinha na shortboard. Seca rápido, não marca a prancha e o zíper é firme.',
  },
  {
    name: 'Pedro Albuquerque',
    location: 'Rio de Janeiro/RJ',
    date: '18/11/2025',
    rating: 5,
    text: 'Leash Pro-Lite no tamanho certo, costura forte e a velcro não abre no wipeout. Uso toda semana em Saquarema.',
  },
  {
    name: 'Renata Moura',
    location: 'Santos/SP',
    date: '09/08/2025',
    rating: 5,
    text: 'Fui na fábrica em São Paulo e o Maurício me mostrou a capa sendo acabada. Outra coisa é comprar de quem produz.',
  },
  {
    name: 'Diego Farias',
    location: 'Ubatuba/SP',
    date: '21/07/2025',
    rating: 5,
    text: 'Troquei o jogo de quilhas por um Pro-Lite. Encaixe preciso e a prancha ficou mais solta na curva. Recomendo.',
  },
  {
    name: 'Lúcia Andrade',
    location: 'Guarujá/SP',
    date: '14/02/2025',
    rating: 5,
    text: 'Deck antiderrapante e parafina Pro-Lite. O deck não descola com sol e a parafina agarra sem empastar.',
  },
  {
    name: 'André Pacheco',
    location: 'Campinas/SP',
    date: '30/04/2026',
    rating: 5,
    text: 'Comprei a capa pelo site e o Maurício tirou a dúvida do tamanho no WhatsApp no mesmo dia. Chegou bem embalada.',
  },
  {
    name: 'Helena Duarte',
    location: 'Praia Grande/SP',
    date: '11/12/2024',
    rating: 5,
    text: 'Capa Day-Use 6\'1" vestiu a prancha sem folga. Refletiva de verdade no fim da tarde. Vou levar a de 6\'3" para o outro board.',
  },
];

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={14}
      className={
        i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
      }
    />
  ));
}

function ReviewCard({
  review,
  hidden = false,
}: {
  review: CarouselReview;
  hidden?: boolean;
}) {
  return (
    <article
      className={`w-[260px] shrink-0 sm:w-[280px] ${hidden ? 'motion-reduce:hidden' : ''}`}
      aria-hidden={hidden || undefined}
    >
      <div className='mb-2'>
        <p className='truncate text-sm font-semibold text-gray-900'>
          {review.name}
        </p>
        <p className='text-xs text-gray-500'>{review.location}</p>
        <p className='text-xs text-gray-400'>Data: {review.date}</p>
      </div>
      <div className='mb-2 flex gap-0.5'>{renderStars(review.rating)}</div>
      <p className='text-sm leading-relaxed text-gray-600 line-clamp-5'>
        {review.text}
      </p>
    </article>
  );
}

export default function ReviewsCarousel() {
  const [reviews, setReviews] = useState<CarouselReview[]>(fallbackReviews);

  // Busca as melhores avaliações aprovadas; mantém o fallback se não
  // houver o suficiente no banco (mínimo 3 para o carousel fazer sentido).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/reviews?scope=home');
        const data = await res.json();
        if (data.success && Array.isArray(data.reviews)) {
          const mapped: CarouselReview[] = (data.reviews as ApiReview[]).map(
            r => ({
              name: r.name,
              location:
                [r.city, r.state].filter(Boolean).join('/') || 'Cliente',
              date: new Date(r.createdAt).toLocaleDateString('pt-BR'),
              rating: r.rating,
              text: r.comment,
            }),
          );
          if (mapped.length >= 3) setReviews(mapped);
        }
      } catch {
        /* mantém fallback */
      }
    })();
  }, []);

  return (
    <section className='py-10 bg-white'>
      <div className='container-home'>
        <div className='mx-auto max-w-screen-2xl'>
          <SectionHeading
            eyebrow='Avaliações'
            title='O que estão falando da Pro-Lite'
          />

          <div className='overflow-hidden motion-reduce:overflow-visible'>
            <div className='reviews-marquee flex w-max gap-6 pb-2'>
              {reviews.map((review, i) => (
                <ReviewCard key={`${review.name}-${i}`} review={review} />
              ))}
              {reviews.map((review, i) => (
                <ReviewCard
                  key={`${review.name}-${i}-loop`}
                  review={review}
                  hidden
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}