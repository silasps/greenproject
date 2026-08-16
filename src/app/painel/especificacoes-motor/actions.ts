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

  // Trava o "posso pegar um PDF qualquer e inserir aqui" na raiz — só aceita URL do
  // próprio domínio da ANFAVEA. A checagem de conteúdo (parseTabelaAnfavea, referência
  // à IN Ibama 127/2006) é a segunda camada, depois de baixar o PDF.
  let host: string;
  try {
    host = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    throw new Error("URL inválida.");
  }
  if (host !== "anfavea.com.br" && !host.endsWith(".anfavea.com.br")) {
    throw new Error("Só aceito URLs do domínio anfavea.com.br — a fonte precisa ser o site oficial da ANFAVEA.");
  }

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

/**
 * Cadastro manual de 1 linha (marca com tabela em layout transposto, ex.: Scania/
 * Toyota/Fiat — o parser genérico recusa essas de propósito, ver parse-anfavea.ts).
 * Já nasce confirmada: quem preenche está lendo o PDF oficial na hora, mesmo nível
 * de confiança que sempre existiu no cadastro manual pelo formulário do veículo.
 */
export async function adicionarEspecificacaoManual(formData: FormData) {
  await requirePermissao();
  const marca = String(formData.get("marca") || "").trim();
  const modelo = String(formData.get("modelo") || "").trim() || null;
  const identificacaoMotor = String(formData.get("identificacao_motor") || "").trim();
  if (!marca || !identificacaoMotor) throw new Error("Marca e identificação do motor são obrigatórios.");

  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s ? Number(s) : null;
  };

  const admin = createAdminClient();
  const { error } = await admin.from("especificacoes_motor").upsert(
    {
      marca,
      modelo,
      identificacao_motor: identificacaoMotor,
      marcha_lenta_min: num(formData.get("marcha_lenta_min")),
      marcha_lenta_max: num(formData.get("marcha_lenta_max")),
      rotacao_corte_min: num(formData.get("rotacao_corte_min")),
      rotacao_corte_max: num(formData.get("rotacao_corte_max")),
      limite_opacidade: num(formData.get("limite_opacidade")),
      origem: "manual",
      status: "confirmado",
    },
    { onConflict: "marca,identificacao_motor" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/painel/especificacoes-motor");
}

/** Botão "Verificar todos" — mesma lógica do cron, uma marca de cada vez, sequencial
 * (evita estourar limite de conexões simultâneas do Supabase). Pode demorar alguns
 * minutos na primeira vez; reverificações são rápidas pra marca cujo PDF não mudou
 * (só compara hash, não reprocessa). Ver `maxDuration` em page.tsx. */
export async function verificarTodasAsFontes() {
  await requirePermissao();
  const admin = createAdminClient();
  const { data: fontes } = await admin.from("fontes_anfavea").select("marca, url_tabela_pdf").order("marca");

  let verificadas = 0;
  let comErro = 0;
  for (const fonte of fontes ?? []) {
    try {
      await importarTabelaAnfaveaInterno(admin, fonte.marca, fonte.url_tabela_pdf);
      verificadas++;
    } catch {
      comErro++;
    }
  }

  revalidatePath("/painel/especificacoes-motor");
  return { total: (fontes ?? []).length, verificadas, comErro };
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
