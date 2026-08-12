"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/session";
import { getLoginDestination, type Role } from "@/lib/auth/permissions";

const IMPERSONATOR_COOKIE = "gp_impersonator_refresh";

export type UsuarioImpersonavel = { id: string; nome: string; role: Role; email: string };

export async function estaImpersonando() {
  const cookieStore = await cookies();
  return cookieStore.has(IMPERSONATOR_COOKIE);
}

/** Lista pro dropdown de troca de identidade — vazia se quem chama não for
 * superadmin nem estiver no meio de uma impersonação (ver assumirIdentidade). */
export async function listarUsuariosParaImpersonar(): Promise<UsuarioImpersonavel[]> {
  const { perfil } = await requireAuth();
  const jaImpersonando = await estaImpersonando();
  if (!perfil.is_superadmin && !jaImpersonando) return [];

  const admin = createAdminClient();
  const { data: perfis } = await admin
    .from("usuarios_perfis")
    .select("id, nome, role")
    .eq("acesso_sistema", true)
    .order("nome");
  if (!perfis) return [];

  const { data: usersList } = await admin.auth.admin.listUsers();
  const emailPorId = new Map((usersList?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return perfis
    .filter((p) => p.id !== perfil.id)
    .map((p) => ({ id: p.id, nome: p.nome, role: p.role as Role, email: emailPorId.get(p.id) ?? "" }));
}

/** Troca a sessão real do servidor pra a do usuário-alvo (não é uma simulação
 * de UI — a partir daqui toda RLS/ação de servidor roda como aquele usuário
 * de verdade). Guarda o refresh_token de quem iniciou num cookie httpOnly
 * pra dar pra voltar depois (voltarAoAdmin). */
export async function assumirIdentidade(usuarioId: string) {
  const { perfil } = await requireAuth();
  const cookieStore = await cookies();
  const refreshTokenOriginal = cookieStore.get(IMPERSONATOR_COOKIE)?.value;

  if (!perfil.is_superadmin && !refreshTokenOriginal) {
    redirect("/acesso-negado");
  }

  const admin = createAdminClient();
  const { data: alvoPerfil } = await admin
    .from("usuarios_perfis")
    .select("role, acesso_sistema")
    .eq("id", usuarioId)
    .single();
  if (!alvoPerfil || !alvoPerfil.acesso_sistema) {
    throw new Error("Usuário indisponível.");
  }

  const { data: alvoUserData } = await admin.auth.admin.getUserById(usuarioId);
  const alvoEmail = alvoUserData.user?.email;
  if (!alvoEmail) throw new Error("Usuário sem e-mail cadastrado.");

  const supabase = await createClient();

  if (!refreshTokenOriginal) {
    const {
      data: { session: sessaoAtual },
    } = await supabase.auth.getSession();
    if (!sessaoAtual) redirect("/login");
    cookieStore.set(IMPERSONATOR_COOKIE, sessaoAtual.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: alvoEmail,
  });
  if (linkError) throw new Error(linkError.message);

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) throw new Error(verifyError.message);

  redirect(getLoginDestination(alvoPerfil.role));
}

export async function voltarAoAdmin() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(IMPERSONATOR_COOKIE)?.value;
  cookieStore.delete(IMPERSONATOR_COOKIE);

  if (!refreshToken) redirect("/painel");

  const supabase = await createClient();
  const { error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error) redirect("/login");

  redirect("/painel");
}
