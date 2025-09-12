import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

// Avoid static prerender/export issues during build; render pages dynamically
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Glavito Admin Dashboard',
  description: 'Comprehensive customer support platform',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
  },
} as const;

export const viewport = {
  themeColor: '#3b82f6',
} as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout should define <html> and <body> only once for the whole app.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} theme-transition`} suppressHydrationWarning>
        {/* Register service worker on client */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  const sw = '/sw.js';
                  navigator.serviceWorker.register(sw).catch(function () { /* ignore */ });
                });
              }
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}