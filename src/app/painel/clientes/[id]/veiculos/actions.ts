"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function salvarVeiculo(formData: FormData) {
  await requireRole(["escritorio", "gerencia"]);

  const clienteId = String(formData.get("cliente_id"));
  const tipoAtivo = String(formData.get("tipo_ativo"));
  const identificador = String(formData.get("identificador")).trim().toUpperCase();
  const marca = String(formData.get("marca") || "").trim();
  const modelo = String(formData.get("modelo") || "").trim();
  const identificacaoMotor = String(formData.get("identificacao_motor") || "").trim();
  const combustivel = String(formData.get("combustivel") || "").trim();
  const anoRaw = String(formData.get("ano") || "");
  const ano = anoRaw ? Number(anoRaw) : null;

  if (!identificador) throw new Error("Placa/número de série é obrigatório.");

  const admin = createAdminClient();

  let especificacaoMotorId: string | null = null;
  const marchaLentaMin = numOrNull(formData.get("marcha_lenta_min"));
  const marchaLentaMax = numOrNull(formData.get("marcha_lenta_max"));
  const rotacaoCorteMin = numOrNull(formData.get("rotacao_corte_min"));
  const rotacaoCorteMax = numOrNull(formData.get("rotacao_corte_max"));
  const limiteOpacidade = numOrNull(formData.get("limite_opacidade"));

  if (marca && identificacaoMotor) {
    const { data: existente } = await admin
      .from("especificacoes_motor")
      .select("id")
      .eq("marca", marca)
      .eq("identificacao_motor", identificacaoMotor)
      .maybeSingle();

    if (existente) {
      especificacaoMotorId = existente.id;
      await admin
        .from("especificacoes_motor")
        .update({
          marcha_lenta_min: marchaLentaMin,
          marcha_lenta_max: marchaLentaMax,
          rotacao_corte_min: rotacaoCorteMin,
          rotacao_corte_max: rotacaoCorteMax,
          limite_opacidade: limiteOpacidade,
        })
        .eq("id", existente.id);
    } else if (marchaLentaMin || rotacaoCorteMin || limiteOpacidade) {
      const { data: criado } = await admin
        .from("especificacoes_motor")
        .insert({
          marca,
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
      especificacaoMotorId = criado?.id ?? null;
    }
  }

  const payload: Record<string, unknown> = {
    cliente_id: clienteId,
    tipo_ativo: tipoAtivo,
    identificador,
    marca,
    modelo,
    identificacao_motor: identificacaoMotor,
    combustivel,
    ano,
    especificacao_motor_id: especificacaoMotorId,
  };

  if (tipoAtivo === "veiculo") {
    payload.chassi = String(formData.get("chassi") || "").trim();
    payload.renavam = String(formData.get("renavam") || "").trim();
  } else {
    payload.patrimonio_cliente = String(formData.get("patrimonio_cliente") || "").trim();
  }

  const { error } = await admin.from("veiculos_maquinas").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/painel/clientes/${clienteId}`);
  redirect(`/painel/clientes/${clienteId}`);
}

function numOrNull(value: FormDataEntryValue | null) {
  const str = String(value ?? "").trim();
  if (!str) return null;
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}
