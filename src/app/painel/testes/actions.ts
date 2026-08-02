"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { canImportarPdfSyscon, canRevisarELiberarLaudo } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo } from "@/lib/storage/upload";
import { parseEnsaioSyscon } from "@/lib/syscon/parse-ensaio";
import { gerarLaudoPdf } from "@/lib/laudo/gerar-pdf";

async function uploadSeEnviado(bucket: "arquivos-internos", path: string, file: FormDataEntryValue | null) {
  if (file instanceof File && file.size > 0) {
    await uploadArquivo(bucket, path, file);
    return path;
  }
  return undefined;
}

export async function salvarCampo(testeId: string, formData: FormData) {
  await requireAuth();
  const admin = createAdminClient();

  const equipamentoId = String(formData.get("equipamento_id") || "") || null;
  const numeroTeste = String(formData.get("numero_teste") || "").trim();
  if (!numeroTeste) throw new Error("Número do teste é obrigatório.");
  if (!equipamentoId) throw new Error("Selecione o equipamento usado.");

  const update: Record<string, unknown> = {
    equipamento_id: equipamentoId,
    numero_teste: numeroTeste,
    status: "aguardando_pdf_syscon",
  };

  const fotoFrente = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-frente.jpg`, formData.get("foto_frente"));
  const fotoTraseira = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-traseira.jpg`, formData.get("foto_traseira"));
  const fotoPainel = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-painel.jpg`, formData.get("foto_painel"));
  const fotoEtiqueta = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-etiqueta.jpg`, formData.get("foto_etiqueta"));

  if (fotoFrente) update.foto_frente_path = fotoFrente;
  if (fotoTraseira) update.foto_traseira_path = fotoTraseira;
  if (fotoPainel) update.foto_painel_path = fotoPainel;
  if (fotoEtiqueta) update.foto_etiqueta_path = fotoEtiqueta;

  if (!fotoFrente || !fotoTraseira || !fotoPainel || !fotoEtiqueta) {
    throw new Error("Envie as 4 fotos (frente, teste sendo feito, painel e etiqueta) para concluir o campo.");
  }

  const chavesExtras = Array.from(formData.keys()).filter((k) => k.startsWith("foto_extra_"));
  const fotosExtras = (
    await Promise.all(
      chavesExtras.map((chave, i) =>
        uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-extra-${i}.jpg`, formData.get(chave)),
      ),
    )
  ).filter((path): path is string => !!path);
  if (fotosExtras.length > 0) update.fotos_extras = fotosExtras;

  const { error } = await admin.from("testes_opacidade").update(update).eq("id", testeId);
  if (error) throw new Error(error.message);

  revalidatePath(`/painel/testes/${testeId}`);
}

export async function importarPdfSyscon(testeId: string, formData: FormData) {
  const { perfil } = await requireAuth();
  if (!canImportarPdfSyscon(perfil.role)) throw new Error("Sem permissão.");

  const admin = createAdminClient();
  const pdf = formData.get("pdf_ensaio") as File | null;
  if (!pdf || pdf.size === 0) throw new Error("Selecione o PDF exportado pelo Syscon.");

  const { data: teste } = await admin.from("testes_opacidade").select("numero_teste").eq("id", testeId).single();
  if (!teste) throw new Error("Teste não encontrado.");

  const buffer = Buffer.from(await pdf.arrayBuffer());
  const ensaio = await parseEnsaioSyscon(buffer);

  if (ensaio.numeroEnsaio && teste.numero_teste && ensaio.numeroEnsaio !== teste.numero_teste) {
    throw new Error(
      `O número do ensaio no PDF (${ensaio.numeroEnsaio}) não bate com o número digitado em campo (${teste.numero_teste}). Confira se é o PDF certo.`,
    );
  }

  const path = `testes/${testeId}/ensaio-syscon.pdf`;
  await uploadArquivo("arquivos-internos", path, pdf);

  const { error: testeError } = await admin
    .from("testes_opacidade")
    .update({
      pdf_ensaio_original_path: path,
      media_m1: ensaio.mediaM1,
      resultado: ensaio.resultado,
      status: "aguardando_revisao",
    })
    .eq("id", testeId);
  if (testeError) throw new Error(testeError.message);

  if (ensaio.medicoes.length > 0) {
    await admin.from("testes_opacidade_medicoes").delete().eq("teste_id", testeId);
    await admin.from("testes_opacidade_medicoes").insert(
      ensaio.medicoes.map((m) => ({
        teste_id: testeId,
        ciclo_aceleracao: m.ciclo,
        opacidade_m1: m.opacidadeM1,
        tempo_segundos: 4,
      })),
    );
  }

  revalidatePath(`/painel/testes/${testeId}`);
}

export async function liberarLaudo(testeId: string, formData: FormData) {
  const { perfil } = await requireRole(["gerencia"]);
  if (!canRevisarELiberarLaudo(perfil.role)) throw new Error("Sem permissão.");

  const responsavelTecnicoId = String(formData.get("responsavel_tecnico_id") || "");
  if (!responsavelTecnicoId) throw new Error("Selecione o responsável técnico.");

  const admin = createAdminClient();

  const { data: teste } = await admin
    .from("testes_opacidade")
    .select(
      "*, veiculos_maquinas(*, clientes(*)), equipamentos_teste(*), agendamentos(id), testes_opacidade_medicoes(*)",
    )
    .eq("id", testeId)
    .single();
  if (!teste) throw new Error("Teste não encontrado.");
  if (!teste.resultado) throw new Error("Faltam dados do ensaio para liberar o laudo.");

  const { data: responsavel } = await admin
    .from("responsaveis_tecnicos")
    .select("*")
    .eq("id", responsavelTecnicoId)
    .single();
  if (!responsavel) throw new Error("Responsável técnico não encontrado.");

  const { count } = await admin.from("laudos").select("id", { count: "exact", head: true });
  const numero = `${(count ?? 0) + 1}/${new Date().getFullYear().toString().slice(-2)}`;
  const codigoPublico = gerarCodigoPublico();

  const pdfBytes = await gerarLaudoPdf({ teste, responsavel, numero, codigoPublico });

  const pdfPath = `${codigoPublico}.pdf`;
  const adminStorage = admin.storage.from("laudos");
  const { error: uploadError } = await adminStorage.upload(pdfPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error: laudoError } = await admin.from("laudos").insert({
    teste_id: testeId,
    numero,
    codigo_publico: codigoPublico,
    pdf_path: pdfPath,
    responsavel_tecnico_id: responsavelTecnicoId,
  });
  if (laudoError) throw new Error(laudoError.message);

  await admin.from("testes_opacidade").update({ status: "aprovado" }).eq("id", testeId);
  await admin.from("agendamentos").update({ status: "concluido" }).eq("id", teste.agendamento_id);

  revalidatePath(`/painel/testes/${testeId}`);
}

function gerarCodigoPublico() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem chars ambíguos
  let codigo = "";
  for (let i = 0; i < 12; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    if (i % 4 === 3 && i !== 11) codigo += "-";
  }
  return codigo;
}
