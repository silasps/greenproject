import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/permissions";
import { getLoginDestination } from "@/lib/auth/permissions";

export type Perfil = {
  id: string;
  nome: string;
  role: Role;
  funcao_id: string | null;
};

export async function getSession(): Promise<{ perfil: Perfil } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios_perfis")
    .select("id, nome, role, funcao_id, acesso_sistema")
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

export { getLoginDestination };
