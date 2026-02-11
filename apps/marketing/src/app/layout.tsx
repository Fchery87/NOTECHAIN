import React from 'react';
import type { Metadata } from 'next';
import { DM_Sans, Newsreader } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NoteChain - Encrypted Notes & AI Assistant',
  description:
    'Privacy-first, encrypted note-taking with AI-powered assistance. Your thoughts, encrypted, yours alone.',
  keywords: ['encrypted notes', 'privacy', 'AI assistant', 'secure notes', 'end-to-end encryption'],
  openGraph: {
    title: 'NoteChain - Encrypted Notes & AI Assistant',
    description: 'Privacy-first, encrypted note-taking with AI-powered assistance.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${newsreader.variable}`}>
      <body className="font-sans antialiased bg-[#fafaf9] text-stone-900">{children}</body>
    </html>
  );
}
