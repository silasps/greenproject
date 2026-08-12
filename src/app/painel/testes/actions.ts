"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, getMeuResponsavelTecnicoId } from "@/lib/auth/session";
import { canImportarPdfSyscon, canGerenciarClientes } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadArquivo } from "@/lib/storage/upload";
import { parseEnsaioSyscon } from "@/lib/syscon/parse-ensaio";
import { gerarLaudoPdf } from "@/lib/laudo/gerar-pdf";
import { enviarLaudoPorEmail } from "@/lib/laudo/enviar-email";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

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
  const fotoEtiquetaNumero = await uploadSeEnviado(
    "arquivos-internos",
    `testes/${testeId}/foto-etiqueta-numero.jpg`,
    formData.get("foto_etiqueta_numero"),
  );

  if (fotoFrente) update.foto_frente_path = fotoFrente;
  if (fotoTraseira) update.foto_traseira_path = fotoTraseira;
  if (fotoPainel) update.foto_painel_path = fotoPainel;
  if (fotoEtiqueta) update.foto_etiqueta_path = fotoEtiqueta;
  if (fotoEtiquetaNumero) update.foto_etiqueta_numero_path = fotoEtiquetaNumero;

  if (!fotoFrente || !fotoTraseira || !fotoPainel || !fotoEtiqueta || !fotoEtiquetaNumero) {
    throw new Error(
      "Envie as 5 fotos (frente, teste sendo feito, painel, etiqueta completa e etiqueta com o número) para concluir o campo.",
    );
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

/**
 * Reedita os dados de campo (número do teste, equipamento, fotos) depois
 * que o campo já foi concluído — ex.: técnico digitou o número errado.
 * Ao contrário de `salvarCampo`, não mexe no `status` (a etapa já avançou)
 * e fotos não são obrigatórias — só troca as que vierem preenchidas, o
 * upload sobrescreve o mesmo path de sempre (`testes/{id}/foto-*.jpg`).
 * Bloqueado depois do laudo liberado — nesse ponto os dados já viraram um
 * documento oficial emitido, editar por baixo criaria inconsistência.
 */
export async function editarCampo(testeId: string, formData: FormData) {
  const { perfil } = await requireAuth();
  const admin = createAdminClient();

  const { data: teste } = await admin.from("testes_opacidade").select("status, fotos_extras").eq("id", testeId).single();
  if (!teste) throw new Error("Teste não encontrado.");
  if (teste.status === "aprovado") throw new Error("Não é possível editar depois do laudo liberado.");

  const equipamentoId = String(formData.get("equipamento_id") || "") || null;
  const numeroTeste = String(formData.get("numero_teste") || "").trim();
  if (!numeroTeste) throw new Error("Número do teste é obrigatório.");
  if (!equipamentoId) throw new Error("Selecione o equipamento usado.");

  const update: Record<string, unknown> = { equipamento_id: equipamentoId, numero_teste: numeroTeste };

  const fotoFrente = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-frente.jpg`, formData.get("foto_frente"));
  const fotoTraseira = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-traseira.jpg`, formData.get("foto_traseira"));
  const fotoPainel = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-painel.jpg`, formData.get("foto_painel"));
  const fotoEtiqueta = await uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-etiqueta.jpg`, formData.get("foto_etiqueta"));
  const fotoEtiquetaNumero = await uploadSeEnviado(
    "arquivos-internos",
    `testes/${testeId}/foto-etiqueta-numero.jpg`,
    formData.get("foto_etiqueta_numero"),
  );

  if (fotoFrente) update.foto_frente_path = fotoFrente;
  if (fotoTraseira) update.foto_traseira_path = fotoTraseira;
  if (fotoPainel) update.foto_painel_path = fotoPainel;
  if (fotoEtiqueta) update.foto_etiqueta_path = fotoEtiqueta;
  if (fotoEtiquetaNumero) update.foto_etiqueta_numero_path = fotoEtiquetaNumero;

  const chavesExtras = Array.from(formData.keys()).filter((k) => k.startsWith("foto_extra_"));
  const novasExtras = (
    await Promise.all(
      chavesExtras.map((chave, i) =>
        uploadSeEnviado("arquivos-internos", `testes/${testeId}/foto-extra-${Date.now()}-${i}.jpg`, formData.get(chave)),
      ),
    )
  ).filter((path): path is string => !!path);
  if (novasExtras.length > 0) update.fotos_extras = [...(teste.fotos_extras ?? []), ...novasExtras];

  const { error } = await admin.from("testes_opacidade").update(update).eq("id", testeId);
  if (error) throw new Error(error.message);

  await registrarAuditoria({ usuarioId: perfil.id, acao: "editar_campo_teste", entidade: "teste_opacidade", entidadeId: testeId });

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
      `O número do ensaio no PDF (${ensaio.numeroEnsaio}) não bate com o número digitado em campo (${teste.numero_teste}). Confira se é o PDF certo, ou corrija o número em "Dados de campo" acima (lembre de clicar em Salvar antes de tentar importar de novo).`,
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

/**
 * Devolve um teste "aguardando revisão" pra corrigir algo antes de liberar
 * o laudo — pro escritório (reimportar PDF, ex.: PDF errado) ou pro técnico
 * de campo (refazer fotos/número). Descarta o que veio do PDF importado
 * (resultado, média, medições) já que vai ser reimportado de qualquer
 * jeito — mesmo devolvendo só pro escritório, o PDF antigo não vale mais.
 */
export async function devolverRevisao(testeId: string, destino: "campo" | "escritorio", motivo?: string) {
  const { perfil } = await requireAuth();
  if (!(await getMeuResponsavelTecnicoId(perfil.id))) throw new Error("Sem permissão.");

  const admin = createAdminClient();
  const { data: teste } = await admin.from("testes_opacidade").select("status").eq("id", testeId).single();
  if (!teste) throw new Error("Teste não encontrado.");
  if (teste.status !== "aguardando_revisao") throw new Error("Só dá pra devolver um teste que está aguardando revisão.");

  const { error } = await admin
    .from("testes_opacidade")
    .update({
      status: destino === "campo" ? "aguardando_execucao" : "aguardando_pdf_syscon",
      pdf_ensaio_original_path: null,
      resultado: null,
      media_m1: null,
    })
    .eq("id", testeId);
  if (error) throw new Error(error.message);

  await admin.from("testes_opacidade_medicoes").delete().eq("teste_id", testeId);

  await registrarAuditoria({
    usuarioId: perfil.id,
    acao: "devolver_revisao",
    entidade: "teste_opacidade",
    entidadeId: testeId,
    detalhes: { destino, motivo: motivo || null },
  });

  revalidatePath(`/painel/testes/${testeId}`);
}

export async function liberarLaudo(testeId: string, formData: FormData) {
  const { perfil } = await requireAuth();
  if (!(await getMeuResponsavelTecnicoId(perfil.id))) throw new Error("Sem permissão.");

  const responsavelTecnicoId = String(formData.get("responsavel_tecnico_id") || "");
  if (!responsavelTecnicoId) throw new Error("Selecione o responsável técnico.");
  const enviarEmailAoValidar = formData.get("enviar_email") === "true";

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

  await registrarAuditoria({
    usuarioId: perfil.id,
    acao: "liberar_laudo",
    entidade: "laudo",
    entidadeId: testeId,
    detalhes: { numero, codigo_publico: codigoPublico },
  });

  // Envio automático é best-effort: o laudo já foi liberado e emitido de
  // verdade, então uma falha aqui (ex.: cliente sem e-mail cadastrado) não
  // pode desfazer a liberação — o botão manual "Enviar por e-mail" continua
  // disponível na tela do laudo emitido pra tentar de novo depois.
  let emailEnviado = false;
  let emailErro: string | null = null;
  if (enviarEmailAoValidar) {
    try {
      await enviarLaudoPorEmail(testeId);
      emailEnviado = true;
      await registrarAuditoria({
        usuarioId: perfil.id,
        acao: "enviar_laudo_email",
        entidade: "laudo",
        entidadeId: testeId,
        detalhes: { via: "validar_teste" },
      });
    } catch (e) {
      emailErro = e instanceof Error ? e.message : "Não foi possível enviar o e-mail.";
    }
  }

  revalidatePath(`/painel/testes/${testeId}`);
  return { emailEnviado, emailErro };
}

/** Envia o laudo já emitido por e-mail — mesmo texto/dados da mensagem de WhatsApp, formatado em HTML. */
export async function enviarLaudoEmail(testeId: string) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) throw new Error("Sem permissão.");

  await enviarLaudoPorEmail(testeId);

  await registrarAuditoria({
    usuarioId: perfil.id,
    acao: "enviar_laudo_email",
    entidade: "laudo",
    entidadeId: testeId,
  });
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
