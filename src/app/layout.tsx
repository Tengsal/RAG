import type { Metadata } from 'next';
import '@/app/globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Scholarly Precision | Academic AI Dashboard',
  description: 'AI-Powered University Assistant for Admissions, Fee Structure, Exams & Campus Regulations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-on-surface font-body-md antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
