"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo } from "@/lib/storage/upload";

export async function salvarResponsavelTecnico(formData: FormData) {
  await requireArea("responsaveis_tecnicos");

  const nome = String(formData.get("nome")).trim();
  const formacao = String(formData.get("formacao") || "").trim();
  const registroConselho = String(formData.get("registro_conselho") || "").trim();
  const contato = String(formData.get("contato") || "").trim();
  const usuarioIdBruto = String(formData.get("usuario_id") || "none");
  const usuarioId = usuarioIdBruto === "none" ? null : usuarioIdBruto;
  const assinatura = formData.get("assinatura") as File | null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const admin = createAdminClient();
  const { data: responsavel, error } = await admin
    .from("responsaveis_tecnicos")
    .insert({ nome, formacao, registro_conselho: registroConselho, contato, usuario_id: usuarioId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (assinatura && assinatura.size > 0) {
    const path = `responsaveis-tecnicos/${responsavel.id}/assinatura.png`;
    await uploadArquivo("arquivos-internos", path, assinatura);
    await admin.from("responsaveis_tecnicos").update({ imagem_assinatura_path: path }).eq("id", responsavel.id);
  }

  revalidatePath("/painel/responsaveis-tecnicos");
  redirect("/painel/responsaveis-tecnicos");
}
