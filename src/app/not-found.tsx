import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center'>
      <h2 className='text-2xl font-bold mb-4'>Página não encontrada</h2>
      <Link
        href='/'
        className='px-4 py-2 bg-chumbo text-white rounded hover:bg-chumbo-light'
      >
        Voltar ao início
      </Link>
    </div>
  );
}
