"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo, publicUrl } from "@/lib/storage/upload";

type GaleriaSlotForm = {
  key: string;
  url: string | null;
  alt: string;
  destaqueMosaico: boolean;
  temNovoArquivo: boolean;
};

type MetodologiaSlotForm = {
  key: string;
  titulo: string;
  descricao: string;
  imagemUrl: string | null;
  imagemAlt: string;
  temNovoArquivo: boolean;
};

function jsonArray<T>(formData: FormData, campo: string): T[] {
  const bruto = formData.get(campo);
  if (!bruto) return [];
  try {
    const parsed = JSON.parse(String(bruto));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function subirImagemSeNecessario(
  arquivo: File | null,
  pasta: string,
  nome: string
): Promise<string | null> {
  if (!arquivo || arquivo.size === 0) return null;
  const path = `${pasta}/${nome}.webp`;
  await uploadArquivo("servicos", path, arquivo);
  return publicUrl("servicos", path);
}

export async function salvarServico(formData: FormData) {
  await requireRole(["gerencia"]);

  const idExistente = String(formData.get("id") || "");
  const servicoId = idExistente || crypto.randomUUID();
  const pastaServico = `servicos/${servicoId}`;

  const titulo = String(formData.get("titulo") || "").trim();
  const resumo = String(formData.get("resumo") || "").trim();
  const headline = String(formData.get("headline") || "").trim();
  const subheadline = String(formData.get("subheadline") || "").trim();
  if (!titulo || !resumo || !headline || !subheadline) {
    throw new Error("Título, resumo, headline e subheadline são obrigatórios.");
  }

  const normas = jsonArray<string>(formData, "normas");
  const beneficios = jsonArray<string>(formData, "beneficios");
  const entregaveis = jsonArray<string>(formData, "entregaveis");

  // Capa
  const capaArquivo = formData.get("capa_arquivo") as File | null;
  const capaUrlAtual = String(formData.get("capa_url_atual") || "") || null;
  const capaUrlNova = await subirImagemSeNecessario(capaArquivo, pastaServico, "capa");
  const coverImageUrl = capaUrlNova ?? capaUrlAtual;
  if (!coverImageUrl) throw new Error("A foto de capa é obrigatória.");
  const coverImageAlt = String(formData.get("capa_alt") || "").trim();
  const coverDestaqueMosaico = formData.get("capa_destaque_mosaico") === "true";

  // Galeria
  const galeriaSlots = jsonArray<GaleriaSlotForm>(formData, "galeria");
  const galeria = await Promise.all(
    galeriaSlots.map(async (slot) => {
      const url = slot.temNovoArquivo
        ? await subirImagemSeNecessario(
            formData.get(`galeria_arquivo_${slot.key}`) as File | null,
            pastaServico,
            `galeria-${slot.key}`
          )
        : slot.url;
      if (!url) return null;
      return { url, alt: slot.alt.trim(), destaque_mosaico: slot.destaqueMosaico };
    })
  );

  // Metodologia
  const metodologiaSlots = jsonArray<MetodologiaSlotForm>(formData, "metodologia");
  const metodologia = await Promise.all(
    metodologiaSlots.map(async (slot) => {
      const imagemUrl = slot.temNovoArquivo
        ? await subirImagemSeNecessario(
            formData.get(`metodologia_arquivo_${slot.key}`) as File | null,
            pastaServico,
            `metodologia-${slot.key}`
          )
        : slot.imagemUrl;
      return {
        titulo: slot.titulo.trim(),
        descricao: slot.descricao.trim(),
        ...(imagemUrl ? { imagem_url: imagemUrl, imagem_alt: slot.imagemAlt.trim() } : {}),
      };
    })
  );

  const publicado = formData.get("publicado") === "on";

  const admin = createAdminClient();
  const dados = {
    titulo,
    resumo,
    headline,
    subheadline,
    normas,
    beneficios,
    entregaveis,
    cover_image_url: coverImageUrl,
    cover_image_alt: coverImageAlt,
    cover_destaque_mosaico: coverDestaqueMosaico,
    galeria: galeria.filter((item): item is NonNullable<typeof item> => item !== null),
    metodologia,
    publicado,
  };

  if (idExistente) {
    const { error } = await admin.from("servicos").update(dados).eq("id", idExistente);
    if (error) throw new Error(error.message);
  } else {
    const slug = String(formData.get("slug") || "").trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("Slug inválido — use apenas letras minúsculas, números e hífen.");
    }
    // Maior ordem atual + 1, pra entrar no fim da lista.
    const { data: maiorOrdem } = await admin
      .from("servicos")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await admin
      .from("servicos")
      .insert({ id: servicoId, slug, ordem: (maiorOrdem?.ordem ?? -1) + 1, ...dados });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/painel/servicos");
  revalidatePath("/", "layout");
  redirect("/painel/servicos");
}

export async function excluirServico(id: string) {
  await requireRole(["gerencia"]);
  const admin = createAdminClient();
  const { error } = await admin.from("servicos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/servicos");
  revalidatePath("/", "layout");
}

export async function alternarPublicado(id: string, publicado: boolean) {
  await requireRole(["gerencia"]);
  const admin = createAdminClient();
  const { error } = await admin.from("servicos").update({ publicado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/servicos");
  revalidatePath("/", "layout");
}

export async function alternarExibirNaHome(id: string, exibirNaHome: boolean) {
  await requireRole(["gerencia"]);
  const admin = createAdminClient();
  const { error } = await admin.from("servicos").update({ exibir_na_home: exibirNaHome }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/servicos");
  revalidatePath("/", "layout");
}

export async function moverOrdem(id: string, direcao: "cima" | "baixo") {
  await requireRole(["gerencia"]);
  const admin = createAdminClient();

  const { data: servicos, error } = await admin
    .from("servicos")
    .select("id, ordem")
    .order("ordem");
  if (error) throw new Error(error.message);

  const lista = servicos ?? [];
  const indice = lista.findIndex((s) => s.id === id);
  const indiceAlvo = direcao === "cima" ? indice - 1 : indice + 1;
  if (indice === -1 || indiceAlvo < 0 || indiceAlvo >= lista.length) return;

  const atual = lista[indice];
  const alvo = lista[indiceAlvo];

  await admin.from("servicos").update({ ordem: alvo.ordem }).eq("id", atual.id);
  await admin.from("servicos").update({ ordem: atual.ordem }).eq("id", alvo.id);

  revalidatePath("/painel/servicos");
  revalidatePath("/", "layout");
}
