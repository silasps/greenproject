import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Upsert de especificacoes_motor por (marca, identificacao_motor) —
 * compartilhado entre o cadastro de veículo (`montarPayloadVeiculo`,
 * `marca` já vem do próprio form) e o cadastro avulso feito em campo
 * (`salvarEspecificacaoMotor`, `marca` vem do veículo já cadastrado) e o
 * cadastro rápido de veículo no modal de criar teste da Agenda.
 * Retorna `null` se não tiver motor+algum limite pra salvar.
 *
 * `modelo` vem por parâmetro porque o nome do campo muda de form pra form
 * (`modelo` no cadastro de veículo, `veiculo_modelo` no cadastro rápido da
 * Agenda; o mini-form de campo nem tem — passa null).
 *
 * Fica fora de um arquivo "use server" de propósito: lá todo export vira
 * server action chamável direto do navegador, sem checagem de login.
 */
export async function upsertEspecificacaoMotor(admin: Admin, marca: string, modelo: string | null, formData: FormData) {
  const identificacaoMotor = String(formData.get("identificacao_motor") || "").trim();
  const marchaLentaMin = numOrNull(formData.get("marcha_lenta_min"));
  const marchaLentaMax = numOrNull(formData.get("marcha_lenta_max"));
  const rotacaoCorteMin = numOrNull(formData.get("rotacao_corte_min"));
  const rotacaoCorteMax = numOrNull(formData.get("rotacao_corte_max"));
  const limiteOpacidade = numOrNull(formData.get("limite_opacidade"));

  if (!marca || !identificacaoMotor) return null;

  const { data: existente } = await admin
    .from("especificacoes_motor")
    .select("id")
    .eq("marca", marca)
    .eq("identificacao_motor", identificacaoMotor)
    .maybeSingle();

  if (existente) {
    await admin
      .from("especificacoes_motor")
      .update({
        // Só sobrescreve modelo se vier um novo — não some um modelo já
        // registrado (ex.: importado da ANFAVEA) só porque essa chamada
        // veio do mini-form de campo, que não tem esse input.
        ...(modelo ? { modelo } : {}),
        marcha_lenta_min: marchaLentaMin,
        marcha_lenta_max: marchaLentaMax,
        rotacao_corte_min: rotacaoCorteMin,
        rotacao_corte_max: rotacaoCorteMax,
        limite_opacidade: limiteOpacidade,
      })
      .eq("id", existente.id);
    return existente.id as string;
  }

  if (!marchaLentaMin && !rotacaoCorteMin && !limiteOpacidade) return null;

  const { data: criado } = await admin
    .from("especificacoes_motor")
    .insert({
      marca,
      modelo,
      identificacao_motor: identificacaoMotor,
      marcha_lenta_min: marchaLentaMin,
      marcha_lenta_max: marchaLentaMax,
      rotacao_corte_min: rotacaoCorteMin,
      rotacao_corte_max: rotacaoCorteMax,
      limite_opacidade: limiteOpacidade,
      origem: "manual",
      status: "confirmado",
    })
    .select("id")
    .single();
  return (criado?.id as string) ?? null;
}

function numOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}
