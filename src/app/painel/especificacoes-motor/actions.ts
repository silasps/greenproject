"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { canGerenciarEspecificacoesMotor } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { importarTabelaAnfaveaInterno } from "@/lib/veiculos/importar-anfavea";

async function requirePermissao() {
  const { perfil } = await requireAuth();
  if (!canGerenciarEspecificacoesMotor(perfil.role)) throw new Error("Sem permissão.");
}

/** Import inicial (form da tela, marca + URL do PDF) ou reimport manual da mesma marca. */
export async function importarTabelaAnfavea(marca: string, url: string) {
  await requirePermissao();
  if (!marca.trim() || !url.trim()) throw new Error("Marca e URL do PDF são obrigatórios.");

  const admin = createAdminClient();
  const resultado = await importarTabelaAnfaveaInterno(admin, marca.trim(), url.trim());
  revalidatePath("/painel/especificacoes-motor");
  return resultado;
}

/** Botão "Verificar agora" — mesma lógica do cron periódico (ver api/cron/atualizar-anfavea), só que sob demanda pra 1 marca. */
export async function verificarAtualizacaoAnfavea(marca: string) {
  await requirePermissao();
  const admin = createAdminClient();

  const { data: fonte } = await admin.from("fontes_anfavea").select("url_tabela_pdf").eq("marca", marca).single();
  if (!fonte) throw new Error("Marca sem fonte cadastrada.");

  const resultado = await importarTabelaAnfaveaInterno(admin, marca, fonte.url_tabela_pdf);
  revalidatePath("/painel/especificacoes-motor");
  return resultado;
}

export async function confirmarEspecificacaoMotor(id: string) {
  await requirePermissao();
  const admin = createAdminClient();
  const { error } = await admin.from("especificacoes_motor").update({ status: "confirmado" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/especificacoes-motor");
}

export async function descartarEspecificacaoMotor(id: string) {
  await requirePermissao();
  const admin = createAdminClient();
  const { error } = await admin
    .from("especificacoes_motor")
    .delete()
    .eq("id", id)
    .eq("status", "pendente_revisao"); // nunca apaga uma linha já confirmada por engano
  if (error) throw new Error(error.message);
  revalidatePath("/painel/especificacoes-motor");
}
