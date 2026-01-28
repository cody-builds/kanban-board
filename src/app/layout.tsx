import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { VersionChecker } from '@/components/VersionChecker';

const inter = Inter({ subsets: ['latin'] });

// Build timestamp for cache busting - injected at build time
const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || Date.now().toString();

export const metadata: Metadata = {
  title: 'Kanban Board | Cody & Claire',
  description: 'Task tracking and collaboration board',
  // Cache control headers via meta tags
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-version={BUILD_VERSION}>
      <head>
        {/* Aggressive cache control for GitHub Pages */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className}>
        <VersionChecker />
        {children}
      </body>
    </html>
  );
}
