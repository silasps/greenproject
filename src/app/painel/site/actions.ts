"use server";

import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits, formatTelefone } from "@/lib/utils/mascaras";

// Um único número digitado pelo gerente — daqui derivamos as duas formas
// que o site já usa: texto formatado (rodapé, PDF) e dígitos com DDI 55
// (links tel:/wa.me), sem risco de ficarem dessincronizados.
export async function salvarContato(formData: FormData) {
  await requireArea("site");

  const digitos = onlyDigits(String(formData.get("telefone") || ""));
  if (digitos.length < 10 || digitos.length > 11) {
    throw new Error("Telefone inválido — informe DDD + número.");
  }

  const telefone = formatTelefone(digitos);
  const whatsapp = `55${digitos}`;

  const admin = createAdminClient();
  const { error } = await admin
    .from("dados_empresa")
    .update({ telefone, whatsapp, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/site");
  revalidatePath("/painel/configuracoes");
  revalidatePath("/", "layout");
}

// Os 3 diferenciais têm ícone fixo no código (não escolhido pela
// gerência) — por isso vêm como campos indexados (diferencial_0_titulo
// etc.), não uma lista dinâmica de adicionar/remover.
export async function salvarPaginaSobre(formData: FormData) {
  await requireArea("site");

  const headline = String(formData.get("headline") || "").trim();
  const introducao = String(formData.get("introducao") || "").trim();
  const comoTrabalhamos = String(formData.get("como_trabalhamos") || "").trim();
  const comoTrabalhamosTemTexto = comoTrabalhamos.replace(/<[^>]*>/g, "").trim().length > 0;
  if (!headline || !introducao || !comoTrabalhamosTemTexto) {
    throw new Error("Preencha todos os campos de texto antes de salvar.");
  }

  const diferenciais = [0, 1, 2].map((i) => {
    const titulo = String(formData.get(`diferencial_${i}_titulo`) || "").trim();
    const descricao = String(formData.get(`diferencial_${i}_descricao`) || "").trim();
    if (!titulo || !descricao) throw new Error(`Preencha título e descrição do diferencial ${i + 1}.`);
    return { titulo, descricao };
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("pagina_sobre")
    .update({
      headline,
      introducao,
      como_trabalhamos: comoTrabalhamos,
      diferenciais,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/site/sobre");
  revalidatePath("/", "layout");
}
