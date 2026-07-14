import type { Metadata } from "next";
import { Cormorant_Garamond, Literata } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const literata = Literata({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Travel Planner",
  description: "Carnet de voyages local.",
};

const cspContent = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "connect-src 'self' api.exchangerate-api.com nominatim.openstreetmap.org",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={cspContent} />
      </head>
      <body className={`${cormorant.variable} ${literata.variable}`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
