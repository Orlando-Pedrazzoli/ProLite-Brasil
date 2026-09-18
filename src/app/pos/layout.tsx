import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'POS — Pro-Lite',
  robots: { index: false, follow: false },
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
