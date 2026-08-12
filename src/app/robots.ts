import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/legal/company-info";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /painel é o sistema interno (protegido por login) — sem valor de
      // indexação e sem motivo pra gastar orçamento de rastreio nele.
      // Páginas privadas por token (laudo, proposta, retestagem) e utilitários
      // de conta (login etc.) ficam de fora daqui de propósito: usam
      // `robots: { index: false }` na própria metadata, que é o jeito certo
      // do Google enxergar o noindex em vez de simplesmente não rastrear.
      disallow: ["/painel", "/painel/"],
    },
    sitemap: `${COMPANY.siteUrl}/sitemap.xml`,
  };
}
