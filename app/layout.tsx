import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.fantasymundial2026.com"),
  title: {
    default: "Fantasy Mundial 2026",
    template: "%s | Fantasy Mundial 2026",
  },
  description:
    "Cria a tua equipa, faz previsões e compete com amigos durante o Mundial 2026.",
  keywords: [
    "Fantasy Mundial 2026",
    "Fantasy Football",
    "Mundial 2026",
    "World Cup Fantasy",
    "Fantasy Futebol",
  ],
  authors: [{ name: "Fantasy Mundial 2026" }],
  creator: "Fantasy Mundial 2026",
  openGraph: {
    title: "Fantasy Mundial 2026",
    description:
      "Cria a tua equipa, faz previsões e compete com amigos durante o Mundial 2026.",
    url: "https://www.fantasymundial2026.com",
    siteName: "Fantasy Mundial 2026",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fantasy Mundial 2026",
      },
    ],
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fantasy Mundial 2026",
    description:
      "Cria a tua equipa, faz previsões e compete com amigos durante o Mundial 2026.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-50">
        {children}
        <Analytics />
      </body>
    </html>
  );
}