import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'Cesta Solidária — Mazotech Sistemas',
  description: 'Gestão de cestas básicas para projetos sociais',
  metadataBase: new URL('https://cestasolidaria.mazotech.com.br'),
};

export const viewport: Viewport = {
  themeColor: '#021D44',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} scrollbar-thin`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-ice text-ink antialiased">
        {children}
      </body>
    </html>
  );
}