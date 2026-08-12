import type { NextConfig } from "next";

// Fotos de serviço enviadas pelo painel ficam no Storage do Supabase
// (bucket público "servicos") — sem isso no remotePatterns o next/image
// bloqueia a URL em runtime.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https" as const,
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  // pdfjs-dist monta um "fake worker" em runtime (import dinâmico de
  // pdf.worker.mjs) para funcionar em Node sem Worker real. Empacotado
  // pelo Next esse import quebra ("Cannot find module .../pdf.worker.mjs"),
  // então usamos require nativo do Node para esse pacote.
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      // Padrão é 1mb — pequeno demais para envio de fotos/PDF de laudo.
      // Fotos já são convertidas para WebP no navegador antes do envio,
      // mas o PDF do ensaio/certificado não é comprimido, então damos
      // uma margem confortável aqui.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
