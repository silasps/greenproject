"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireSuperadmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

// Qualquer pessoa logada pode enviar — não é uma área com acesso
// restrito, é uma caixinha de sugestões pra todo mundo do painel.
export async function enviarSugestao(formData: FormData) {
  const { perfil } = await requireAuth();

  const mensagem = String(formData.get("mensagem") || "").trim();
  const pagina = String(formData.get("pagina") || "").trim();
  const userAgent = String(formData.get("user_agent") || "").trim();
  if (!mensagem) throw new Error("Escreva sua sugestão antes de enviar.");

  const admin = createAdminClient();
  const { error } = await admin.from("sugestoes").insert({
    usuario_id: perfil.id,
    pagina: pagina || "desconhecida",
    mensagem,
    user_agent: userAgent || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/painel/sugestoes");
}

export async function marcarSugestaoComoLida(id: string, lida: boolean) {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("sugestoes").update({ lida }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/sugestoes");
}

export async function excluirSugestao(id: string) {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("sugestoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel/sugestoes");
}
