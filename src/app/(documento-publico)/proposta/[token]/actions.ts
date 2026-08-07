"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function aceitarProposta(token: string) {
  const admin = createAdminClient();
  const headerList = await headers();

  const { data: proposta } = await admin.from("propostas").select("id, status").eq("token", token).maybeSingle();
  if (!proposta || proposta.status !== "enviada") {
    throw new Error("Proposta não encontrada ou já processada.");
  }

  const { error } = await admin
    .from("propostas")
    .update({
      status: "aceita",
      evidencia_aceite: {
        ip: headerList.get("x-forwarded-for") ?? "desconhecido",
        userAgent: headerList.get("user-agent") ?? "desconhecido",
        aceito_em: new Date().toISOString(),
      },
    })
    .eq("id", proposta.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/proposta/${token}`);
}
