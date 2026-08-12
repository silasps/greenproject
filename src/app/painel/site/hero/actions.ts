"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo, publicUrl } from "@/lib/storage/upload";
import { HERO_SERVICO_MAX, HERO_DESCRICAO_MAX } from "@/lib/content/hero-slides";

export async function salvarSlide(formData: FormData) {
  await requireRole(["gerencia"]);

  const idExistente = String(formData.get("id") || "");
  const slideId = idExistente || crypto.randomUUID();

  const servico = String(formData.get("servico") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const linkHref = String(formData.get("link_href") || "").trim();
  const imagemAlt = String(formData.get("imagem_alt") || "").trim();

  if (!servico || !descricao || !linkHref || !imagemAlt) {
    throw new Error("Preencha serviço, descrição, foto (texto alternativo) e o link do botão.");
  }
  if (servico.length > HERO_SERVICO_MAX) {
    throw new Error(`O nome do serviço não pode passar de ${HERO_SERVICO_MAX} caracteres.`);
  }
  if (descricao.length > HERO_DESCRICAO_MAX) {
    throw new Error(`A descrição não pode passar de ${HERO_DESCRICAO_MAX} caracteres.`);
  }

  const imagemArquivo = formData.get("imagem_arquivo") as File | null;
  const imagemUrlAtual = String(formData.get("imagem_url_atual") || "") || null;
  let imagemUrl = imagemUrlAtual;
  if (imagemArquivo && imagemArquivo.size > 0) {
    const path = `hero/${slideId}/imagem.webp`;
    await uploadArquivo("servicos", path, imagemArquivo);
    imagemUrl = publicUrl("servicos", path);
  }
  if (!imagemUrl) throw new Error("A foto do slide é obrigatória.");

  const admin = createAdminClient();
  const dados = {
    servico,
    descricao,
    link_href: linkHref,
    imagem_url: imagemUrl,
    imagem_alt: imagemAlt,
  };

  if (idExistente) {
    const { error } = await admin.from("hero_slides").update(dados).eq("id", idExistente);
    if (error) throw new Error(error.message);
  } else {
    const { data: maiorOrdem } = await admin
      .from("hero_slides")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await admin
      .from("hero_slides")
      .insert({ id: slideId, ordem: (maiorOrdem?.ordem ?? -1) + 1, ...dados });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/painel/site/hero");
  revalidatePath("/", "layout");
  redirect("/painel/site/hero");
}

export async function excluirSlide(id: string) {
  await requireRole(["gerencia"]);
  const admin = createAdminClient();

  const { count } = await admin.from("hero_slides").select("id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    throw new Error("Precisa manter ao menos 1 slide no carrossel da home.");
  }

  const { error } = await admin.from("hero_slides").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/site/hero");
  revalidatePath("/", "layout");
}

export async function moverOrdemSlide(id: string, direcao: "cima" | "baixo") {
  await requireRole(["gerencia"]);
  const admin = createAdminClient();

  const { data: slides, error } = await admin.from("hero_slides").select("id, ordem").order("ordem");
  if (error) throw new Error(error.message);

  const lista = slides ?? [];
  const indice = lista.findIndex((s) => s.id === id);
  const indiceAlvo = direcao === "cima" ? indice - 1 : indice + 1;
  if (indice === -1 || indiceAlvo < 0 || indiceAlvo >= lista.length) return;

  const atual = lista[indice];
  const alvo = lista[indiceAlvo];

  await admin.from("hero_slides").update({ ordem: alvo.ordem }).eq("id", atual.id);
  await admin.from("hero_slides").update({ ordem: atual.ordem }).eq("id", alvo.id);

  revalidatePath("/painel/site/hero");
  revalidatePath("/", "layout");
}
