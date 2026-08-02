import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
