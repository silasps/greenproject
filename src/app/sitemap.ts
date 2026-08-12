import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/legal/company-info";
import { SERVICOS } from "@/lib/content/servicos";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = COMPANY.siteUrl;
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

  const paginasServicos: MetadataRoute.Sitemap = SERVICOS.map((servico) => ({
    url: `${baseUrl}/servicos/${servico.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...paginasEstaticas, ...paginasServicos];
}
