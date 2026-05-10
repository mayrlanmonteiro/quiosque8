import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Quiosque8 | CRM Artesanato Nordestino",
    template: "%s | Quiosque8",
  },
  description:
    "Plataforma de gestão completa para a Quiosque8 artesanato nordestino. Catálogo, estoque, vendas, despesas e relatórios.",
  keywords: ["artesanato nordestino", "CRM", "gestão de loja", "estoque"],
  authors: [{ name: "Quiosque8" }],
  creator: "Quiosque8",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Quiosque8 CRM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
