// 📄 src/components/shared/AssistantAvatar.tsx
// Avatar ilustrado da assistente virtual (SVG inline, sem pedido de rede).
// É um desenho de propósito: o atendimento é automático e uma foto de
// pessoa real daria a entender o contrário.

export default function AssistantAvatar({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox='0 0 64 64'
      className={className}
      aria-hidden='true'
      focusable='false'
    >
      {/* Cabelo (atrás) */}
      <path
        d='M15.5 28c0-11 7.4-18 16.5-18s16.5 7 16.5 18v15c0 3.3-2.7 6-6 6h-21c-3.3 0-6-2.7-6-6z'
        fill='#6b4226'
      />
      {/* Ombros / camisa azul Pro-Lite */}
      <path
        d='M8 66c0-13 10-20 24-20s24 7 24 20z'
        fill='var(--color-brand, #1e90ff)'
      />
      {/* Gola */}
      <path d='M25.5 46.5 32 54l6.5-7.5c-2-.4-4.2-.5-6.5-.5s-4.5.1-6.5.5z' fill='#ffffff' />
      {/* Pescoço */}
      <path d='M27.5 39h9v7.5c0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5z' fill='#e9b08a' />
      {/* Rosto */}
      <ellipse cx='32' cy='29' rx='11' ry='12.5' fill='#f6c9a8' />
      {/* Franja */}
      <path
        d='M20.5 28c.5-9 5.5-13.5 11.5-13.5S43 19 43.5 28c-4.5-.8-8.5-3.5-11-7.5-2.5 4-7 6.7-12 7.5z'
        fill='#6b4226'
      />
      {/* Olhos */}
      <circle cx='27.3' cy='30' r='1.35' fill='#2d2f34' />
      <circle cx='36.7' cy='30' r='1.35' fill='#2d2f34' />
      {/* Bochechas */}
      <circle cx='24.8' cy='33.8' r='2' fill='#f29b8e' opacity='.45' />
      <circle cx='39.2' cy='33.8' r='2' fill='#f29b8e' opacity='.45' />
      {/* Sorriso */}
      <path
        d='M28 35c1.1 1.7 2.5 2.5 4 2.5s2.9-.8 4-2.5'
        fill='none'
        stroke='#b9544c'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      {/* Headset: arco, auscultadores e microfone */}
      <path
        d='M18 29c0-10 6.3-16.5 14-16.5S46 19 46 29'
        fill='none'
        stroke='#2d2f34'
        strokeWidth='2.2'
        strokeLinecap='round'
      />
      <rect x='15.3' y='26' width='5.4' height='9.5' rx='2.7' fill='#2d2f34' />
      <rect x='43.3' y='26' width='5.4' height='9.5' rx='2.7' fill='#2d2f34' />
      <path
        d='M18 35c0 4 2.8 5.8 6.5 5.8'
        fill='none'
        stroke='#2d2f34'
        strokeWidth='1.6'
        strokeLinecap='round'
      />
      <circle cx='25.3' cy='40.8' r='1.7' fill='#2d2f34' />
    </svg>
  );
}
