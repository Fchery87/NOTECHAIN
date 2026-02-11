import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SkipLink } from '../components/Accessibility/SkipLink';
import { AriaLiveRegion } from '../components/Accessibility/AriaLiveRegion';
import { UserProvider } from '@/lib/supabase/UserProvider';
import { SyncProvider } from '@/lib/sync/SyncProvider';

export const metadata: Metadata = {
  title: 'NoteChain — Privacy-First Productivity',
  description:
    'Your thoughts, tasks, and documents. Encrypted. Yours alone. A privacy-first productivity suite with end-to-end encryption.',
  keywords: ['privacy', 'encryption', 'productivity', 'notes', 'tasks', 'secure'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="6" fill="%231c1917"/><rect x="8" y="8" width="7" height="7" rx="1" fill="%23f59e0b"/><rect x="17" y="8" width="7" height="7" rx="1" fill="%2357534e"/><rect x="8" y="17" width="7" height="7" rx="1" fill="%2357534e"/><rect x="17" y="17" width="7" height="7" rx="1" fill="%23f43f5e"/></svg>',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fafaf9',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <UserProvider>
          <SyncProvider>
            {/* Accessibility: Skip to main content link */}
            <SkipLink targetId="main-content" />

            {/* Accessibility: Live region for screen reader announcements */}
            <AriaLiveRegion />

            {/* Main content area */}
            <main id="main-content" className="outline-none focus:ring-0">
              {children}
            </main>
          </SyncProvider>
        </UserProvider>
      </body>
    </html>
  );
}
