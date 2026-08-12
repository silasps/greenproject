"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo } from "@/lib/storage/upload";

function extensaoDoArquivo(file: File) {
  if (file.type === "application/pdf") return "pdf";
  const porTipo = file.type.split("/")[1];
  if (porTipo) return porTipo;
  const porNome = file.name.split(".").pop();
  return porNome || "bin";
}

export async function salvarEquipamento(formData: FormData) {
  const { perfil } = await requireArea("equipamentos");

  const id = String(formData.get("id") || "");
  const tipo = String(formData.get("tipo"));
  const modelo = String(formData.get("modelo")).trim();
  const numeroSerie = String(formData.get("numero_serie")).trim();
  const fabricante = String(formData.get("fabricante") || "").trim();
  const numeroInmetro = String(formData.get("numero_inmetro") || "").trim();
  const dataAfericao = String(formData.get("data_afericao") || "") || null;
  const validade = String(formData.get("validade") || "") || null;
  const certificado = formData.get("certificado") as File | null;

  if (!modelo || !numeroSerie) throw new Error("Modelo e número de série são obrigatórios.");

  const admin = createAdminClient();
  const dadosBase = {
    tipo,
    modelo,
    numero_serie: numeroSerie,
    fabricante,
    numero_inmetro: numeroInmetro,
    data_afericao: dataAfericao,
    validade,
  };

  let equipamentoId = id;

  if (id) {
    const { error } = await admin
      .from("equipamentos_teste")
      .update({ ...dadosBase, atualizado_por: perfil.id, atualizado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { data: equipamento, error } = await admin
      .from("equipamentos_teste")
      .insert({ ...dadosBase, criado_por: perfil.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    equipamentoId = equipamento.id;
  }

  if (certificado && certificado.size > 0) {
    const path = `equipamentos/${equipamentoId}/certificado-calibracao.${extensaoDoArquivo(certificado)}`;
    await uploadArquivo("arquivos-internos", path, certificado);
    await admin.from("equipamentos_teste").update({ pdf_certificado_calibracao_path: path }).eq("id", equipamentoId);
  }

  revalidatePath("/painel/equipamentos");
  revalidatePath(`/painel/equipamentos/${equipamentoId}`);
  redirect(`/painel/equipamentos/${equipamentoId}`);
}
