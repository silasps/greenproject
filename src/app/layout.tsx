import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { COMPANY } from "@/lib/legal/company-info";
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
  metadataBase: new URL(COMPANY.siteUrl),
  title: "Greenproject Engenharia | Laudos e Inspeções Técnicas",
  description:
    "Laudos de opacidade, inspeção veicular e serviços de engenharia mecânica e de segurança do trabalho, com atendimento no local.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Greenproject Engenharia",
    title: "Greenproject Engenharia | Laudos e Inspeções Técnicas",
    description:
      "Laudos de opacidade, inspeção veicular e serviços de engenharia mecânica e de segurança do trabalho, com atendimento no local.",
    images: ["/brand/logo-completa.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#109b15" showSpinner={false} height={3} />
        {children}
      </body>
    </html>
  );
}
