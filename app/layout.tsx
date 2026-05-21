import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VAC-P | Sybella Systems Ltd',
  description: 'Virtual Accountability & Collaboration Platform for Sybella Systems Ltd',

  manifest: '/manifest.json',

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
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
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <ServiceWorkerRegister />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}