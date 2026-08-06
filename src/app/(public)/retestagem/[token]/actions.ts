"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export async function solicitarRetestagem(token: string, formData: FormData) {
  const admin = createAdminClient();

  const { data: contato } = await admin
    .from("contatos_retestagem")
    .select("veiculo_id")
    .eq("token", token)
    .maybeSingle();
  if (!contato) throw new Error("Link inválido.");

  const { data: veiculo } = await admin
    .from("veiculos_maquinas")
    .select("cliente_id")
    .eq("id", contato.veiculo_id)
    .maybeSingle();
  if (!veiculo) throw new Error("Veículo não encontrado.");

  const mensagem = String(formData.get("mensagem") || "").trim();

  const { error } = await admin.from("solicitacoes_retestagem").insert({
    cliente_id: veiculo.cliente_id,
    veiculo_id: contato.veiculo_id,
    mensagem: mensagem || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/retestagem/${token}`);
}
