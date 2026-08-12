"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { KPI_SECOES } from "@/lib/kpis/catalogo";
import { onlyDigits, formatTelefone } from "@/lib/utils/mascaras";

export async function salvarValorKm(formData: FormData) {
  await requireRole(["gerencia"]);

  const valorKm = Number(formData.get("valor_km") ?? 0);

  const admin = createAdminClient();
  const { error } = await admin
    .from("configuracoes_orcamento")
    .update({ valor_km: valorKm, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
}

export async function salvarFatorCorrecaoDistancia(formData: FormData) {
  await requireRole(["gerencia"]);

  const fatorCorrecaoDistancia = Number(formData.get("fator_correcao_distancia") ?? 1.4);

  const admin = createAdminClient();
  const { error } = await admin
    .from("configuracoes_orcamento")
    .update({ fator_correcao_distancia: fatorCorrecaoDistancia, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
}

// O telefone salvo aqui é o mesmo número usado no site inteiro (cabeçalho,
// botão de WhatsApp, "Ligar agora" — ver /painel/site → Informações de
// contato). Por isso deriva `whatsapp` a partir do mesmo dígitos, com a
// mesma lógica de salvarContato (src/app/painel/site/actions.ts) — editar
// só o telefone aqui, sem atualizar o whatsapp junto, deixaria os dois
// dessincronizados.
export async function salvarDadosEmpresa(formData: FormData) {
  await requireRole(["gerencia"]);

  const razaoSocial = String(formData.get("razao_social") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const digitosTelefone = onlyDigits(String(formData.get("telefone") ?? ""));
  if (!razaoSocial || !cnpj || !endereco) throw new Error("Preencha todos os dados da empresa.");
  if (digitosTelefone.length < 10 || digitosTelefone.length > 11) {
    throw new Error("Telefone inválido — informe DDD + número.");
  }

  const telefone = formatTelefone(digitosTelefone);
  const whatsapp = `55${digitosTelefone}`;

  const admin = createAdminClient();
  const { error } = await admin
    .from("dados_empresa")
    .update({ razao_social: razaoSocial, cnpj, endereco, telefone, whatsapp, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
  revalidatePath("/painel/site");
  revalidatePath("/", "layout");
}

export async function criarTipoServico(formData: FormData) {
  await requireRole(["gerencia"]);

  const nome = String(formData.get("nome") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  if (!nome) throw new Error("Preencha o nome do serviço.");

  const admin = createAdminClient();
  const { error } = await admin.from("tipos_servico").insert({ nome, valor });
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
}

export async function atualizarTipoServico(formData: FormData) {
  await requireRole(["gerencia"]);

  const id = String(formData.get("id") ?? "");
  const valor = Number(formData.get("valor") ?? 0);
  if (!id) throw new Error("Serviço inválido.");

  const admin = createAdminClient();
  const { error } = await admin.from("tipos_servico").update({ valor }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
}

/** Exclusão lógica (ativo = false) — mantém histórico e não quebra agendamentos já criados com esse tipo. */
export async function excluirTipoServico(id: string) {
  await requireRole(["gerencia"]);

  const admin = createAdminClient();
  const { error } = await admin.from("tipos_servico").update({ ativo: false }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
}

export async function salvarFuncaoKpis(formData: FormData) {
  await requireRole(["gerencia"]);

  const funcaoId = String(formData.get("funcao_id") ?? "");
  if (!funcaoId) throw new Error("Cargo inválido.");

  const linhas = KPI_SECOES.map((secao) => ({
    funcao_id: funcaoId,
    kpi_secao: secao.key,
    visivel: formData.get(`kpi_${secao.key}`) === "on",
  }));

  const admin = createAdminClient();
  const { error } = await admin.from("funcoes_kpis").upsert(linhas, { onConflict: "funcao_id,kpi_secao" });
  if (error) throw new Error(error.message);

  revalidatePath("/painel/configuracoes");
  revalidatePath("/painel");
}
