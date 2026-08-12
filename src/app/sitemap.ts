import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/legal/company-info";
import { getServicos } from "@/lib/content/servicos";

// Sem isso o Next cacheia a lista de serviços no build (mesmo motivo do
// (public)/layout.tsx) — um serviço novo criado no painel não apareceria
// aqui sem redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = COMPANY.siteUrl;
  const servicos = await getServicos();
  const now = new Date();

  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/servicos`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/contato`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const paginasServicos: MetadataRoute.Sitemap = servicos.map((servico) => ({
    url: `${baseUrl}/servicos/${servico.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...paginasEstaticas, ...paginasServicos];
}
