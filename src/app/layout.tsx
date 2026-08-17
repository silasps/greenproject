import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { COMPANY } from "@/lib/legal/company-info";
import "./globals.css";

// Tipografia do sistema inteiro (site público e painel interno) — IBM Plex
// nasceu como fonte técnica da IBM pra documentação de engenharia, o que
// conversa direto com "laudo técnico".
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const plexSansCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-sans-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
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

// maximumScale/userScalable travam o zoom automático que o Safari/Chrome
// mobile disparam ao focar um input (o "pulo" de tela nos modais); já
// interactiveWidget faz o teclado virtual encolher a viewport de layout em
// vez de só sobrepor por cima, então o `dvh` usado nos modais acompanha o
// teclado corretamente.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${plexSans.variable} ${plexSansCondensed.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader color="#109b15" showSpinner={false} height={3} />
        {children}
      </body>
    </html>
  );
}
