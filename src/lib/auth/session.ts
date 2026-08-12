import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/permissions";
import { getLoginDestination } from "@/lib/auth/permissions";

export type Perfil = {
  id: string;
  nome: string;
  role: Role;
  funcao_id: string | null;
  is_superadmin: boolean;
};

export async function getSession(): Promise<{ perfil: Perfil } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios_perfis")
    .select("id, nome, role, funcao_id, acesso_sistema, is_superadmin")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.acesso_sistema === false) return null;

  return { perfil: perfil as Perfil };
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowedRoles: readonly Role[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.perfil.role)) {
    redirect("/acesso-negado");
  }
  return session;
}

/**
 * Id do responsável técnico (quem assina laudos) vinculado a essa conta de
 * acesso, se houver — usado pra decidir quem pode liberar laudo (é
 * cargo/cadastro em responsaveis_tecnicos, não o role tecnico/escritorio/
 * gerencia) e pra pré-selecionar o próprio nome no formulário de liberação.
 */
export async function getMeuResponsavelTecnicoId(usuarioId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("responsaveis_tecnicos")
    .select("id")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  return data?.id ?? null;
}

export { getLoginDestination };
