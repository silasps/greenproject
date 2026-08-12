import { COMPANY } from "@/lib/legal/company-info";
import type { Servico } from "@/lib/content/servicos";

// COMPANY.endereco já vem como "R. Monsenhor Messias, 1093 - Flamengo, Contagem - MG" —
// só separamos os campos que o schema.org PostalAddress espera, sem inventar
// dado nenhum que não esteja no cadastro (ex.: não temos CEP confirmado).
const ENDERECO = {
  "@type": "PostalAddress" as const,
  streetAddress: "R. Monsenhor Messias, 1093 - Flamengo",
  addressLocality: "Contagem",
  addressRegion: "MG",
  addressCountry: "BR",
};

const AREA_ATENDIMENTO = {
  "@type": "AdministrativeArea" as const,
  name: "Região Metropolitana de Belo Horizonte",
};

export function buildLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${COMPANY.siteUrl}/#organization`,
    name: COMPANY.razaoSocial,
    url: COMPANY.siteUrl,
    image: `${COMPANY.siteUrl}/brand/logo-completa.png`,
    telephone: COMPANY.telefone,
    email: COMPANY.email,
    address: ENDERECO,
    areaServed: AREA_ATENDIMENTO,
    description:
      "Engenharia mecânica e segurança do trabalho com atendimento técnico em campo: laudos, inspeções e ensaios.",
  };
}

export function buildServiceSchema(servico: Servico, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: servico.titulo,
    name: servico.titulo,
    description: servico.resumo,
    url,
    provider: {
      "@type": "LocalBusiness",
      name: COMPANY.razaoSocial,
      telephone: COMPANY.telefone,
      address: ENDERECO,
    },
    areaServed: AREA_ATENDIMENTO,
  };
}

export function buildFaqSchema(
  perguntas: readonly { pergunta: string; resposta: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: perguntas.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.resposta,
      },
    })),
  };
}
