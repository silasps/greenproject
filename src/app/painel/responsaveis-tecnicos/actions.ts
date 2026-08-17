"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea, requireAuth, getMeuResponsavelTecnicoId } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo } from "@/lib/storage/upload";

export async function salvarResponsavelTecnico(formData: FormData) {
  await requireArea("responsaveis_tecnicos");

  const id = String(formData.get("id") || "");
  const nome = String(formData.get("nome")).trim();
  const formacao = String(formData.get("formacao") || "").trim();
  const registroConselho = String(formData.get("registro_conselho") || "").trim();
  const contato = String(formData.get("contato") || "").trim();
  const usuarioIdBruto = String(formData.get("usuario_id") || "none");
  const usuarioId = usuarioIdBruto === "none" ? null : usuarioIdBruto;
  const assinatura = formData.get("assinatura") as File | null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const admin = createAdminClient();
  const dadosBase = { nome, formacao, registro_conselho: registroConselho, contato, usuario_id: usuarioId };

  let responsavelId = id;
  if (id) {
    const { error } = await admin.from("responsaveis_tecnicos").update(dadosBase).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: responsavel, error } = await admin
      .from("responsaveis_tecnicos")
      .insert(dadosBase)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    responsavelId = responsavel.id;
  }

  if (assinatura && assinatura.size > 0) {
    const path = `responsaveis-tecnicos/${responsavelId}/assinatura.png`;
    await uploadArquivo("arquivos-internos", path, assinatura);
    await admin.from("responsaveis_tecnicos").update({ imagem_assinatura_path: path }).eq("id", responsavelId);
  }

  revalidatePath("/painel/responsaveis-tecnicos");
  redirect("/painel/responsaveis-tecnicos");
}

/**
 * Upload rápido só da assinatura, usado no modal que trava "Validar teste"
 * quando o responsável ainda não tem imagem cadastrada — sem passar pela
 * tela de edição completa. Qualquer um pode cadastrar a própria (é o
 * responsável técnico vinculado à própria conta); cadastrar a de outro
 * exige a área administrativa de responsáveis técnicos.
 */
export async function salvarAssinaturaResponsavel(responsavelId: string, formData: FormData) {
  const { perfil } = await requireAuth();
  const meuResponsavelId = await getMeuResponsavelTecnicoId(perfil.id);
  if (meuResponsavelId !== responsavelId) {
    await requireArea("responsaveis_tecnicos");
  }

  const assinatura = formData.get("assinatura") as File | null;
  if (!assinatura || assinatura.size === 0) throw new Error("Selecione a imagem da assinatura.");

  const admin = createAdminClient();
  const path = `responsaveis-tecnicos/${responsavelId}/assinatura.png`;
  await uploadArquivo("arquivos-internos", path, assinatura);
  const { error } = await admin.from("responsaveis_tecnicos").update({ imagem_assinatura_path: path }).eq("id", responsavelId);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/responsaveis-tecnicos");
}
