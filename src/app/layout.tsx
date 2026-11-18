import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'DAYLOG AI — Diário Pessoal Inteligente',
  description: 'Diário pessoal local-first com inteligência artificial, gravação por voz e máxima privacidade.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DAYLOG AI',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080A0B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-background text-primary min-h-screen flex justify-center selection:bg-accent selection:text-background">
        <div className="w-full max-w-md min-h-screen flex flex-col relative bg-background border-x border-border/40 shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
