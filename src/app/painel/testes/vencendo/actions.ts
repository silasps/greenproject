"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/** Loga o clique em "Enviar WhatsApp" — só pra aparecer no histórico de contato (evita incomodar demais). */
export async function registrarContatoWhatsapp(veiculoId: string, laudoId: string) {
  const { perfil } = await requireAuth();
  const admin = createAdminClient();

  const { error } = await admin.from("contatos_retestagem").insert({
    veiculo_id: veiculoId,
    laudo_id: laudoId,
    canal: "whatsapp",
    enviado_por: perfil.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/painel/testes/vencendo");
}

/** Marca uma solicitação de retestagem (vinda do link público) como já tratada. */
export async function marcarSolicitacaoRetestagem(id: string, status: "agendado" | "descartada") {
  await requireAuth();
  const admin = createAdminClient();

  const { error } = await admin.from("solicitacoes_retestagem").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/testes/vencendo");
}
