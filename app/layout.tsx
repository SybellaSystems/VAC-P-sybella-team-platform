import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VAC-P | Sybella Systems Ltd',
  description: 'Virtual Accountability & Collaboration Platform for Sybella Systems Ltd',

  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.svg',
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.svg',
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VAC-P',
  },

  formatDetection: {
    telephone: false,
  },

  themeColor: '#1d4ed8',

  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Ensure browser tab favicon is explicitly set (Next metadata may be cached). */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <ServiceWorkerRegister />
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

