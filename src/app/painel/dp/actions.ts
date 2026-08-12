"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { KPI_SECOES } from "@/lib/kpis/catalogo";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

export type Credenciais = { nome: string; email: string; senha: string; whatsapp: string | null };
export type ResultadoPessoa = { credenciais: Credenciais } | { ok: true };

function gerarSenhaAleatoria() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 16; i++) {
    senha += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return senha;
}

/** Tiptap manda algo como "<p></p>" mesmo vazio — só o texto sem tags conta como preenchido de verdade. */
function descricaoEstaVazia(html: string) {
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

/** A função escolhida define o nível de acesso — busca o role dela no banco (não confia no que vier do form). */
async function obterNivelAcessoDaFuncao(admin: ReturnType<typeof createAdminClient>, funcaoId: string) {
  const { data: funcao, error } = await admin.from("funcoes").select("nivel_acesso").eq("id", funcaoId).single();
  if (error || !funcao) throw new Error("Selecione uma função válida.");
  return funcao.nivel_acesso as string;
}

export async function criarPessoa(formData: FormData): Promise<ResultadoPessoa> {
  await requireRole(["gerencia"]);

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const funcaoId = String(formData.get("funcao_id") ?? "");
  const cpf = String(formData.get("cpf") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const dataAdmissao = String(formData.get("data_admissao") ?? "");
  const acessoSistema = formData.get("acesso_sistema") === "on";

  if (!nome || !email || !funcaoId) {
    throw new Error("Preencha nome, e-mail e função.");
  }

  const admin = createAdminClient();
  const role = await obterNivelAcessoDaFuncao(admin, funcaoId);
  const senha = gerarSenhaAleatoria();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  const { error } = await admin.from("usuarios_perfis").insert({
    id: authUser.user.id,
    nome,
    role,
    funcao_id: funcaoId,
    cpf: cpf || null,
    telefone: telefone || null,
    data_admissao: dataAdmissao || null,
    acesso_sistema: acessoSistema,
  });
  if (error) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(error.message);
  }

  revalidatePath("/painel/dp");

  if (acessoSistema) {
    return { credenciais: { nome, email, senha, whatsapp: telefone || null } };
  }
  return { ok: true };
}

export async function editarPessoa(formData: FormData): Promise<ResultadoPessoa> {
  const { perfil } = await requireRole(["gerencia"]);

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const funcaoId = String(formData.get("funcao_id") ?? "");
  const cpf = String(formData.get("cpf") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const dataAdmissao = String(formData.get("data_admissao") ?? "");
  const acessoSistema = formData.get("acesso_sistema") === "on";

  if (!id || !nome || !funcaoId) throw new Error("Preencha nome e função.");

  const admin = createAdminClient();
  const role = await obterNivelAcessoDaFuncao(admin, funcaoId);

  const { data: antes } = await admin.from("usuarios_perfis").select("acesso_sistema").eq("id", id).single();

  const { error } = await admin
    .from("usuarios_perfis")
    .update({
      nome,
      role,
      funcao_id: funcaoId,
      cpf: cpf || null,
      telefone: telefone || null,
      data_admissao: dataAdmissao || null,
      acesso_sistema: acessoSistema,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Pessoa que muda de ativa pra inativa (ou o contrário) precisa ficar
  // rastreável — quem desligou/religou o acesso de alguém e quando.
  if (antes && antes.acesso_sistema !== acessoSistema) {
    await registrarAuditoria({
      usuarioId: perfil.id,
      acao: acessoSistema ? "ativar_pessoa" : "inativar_pessoa",
      entidade: "pessoa",
      entidadeId: id,
      detalhes: { nome },
    });
  }

  // Acesso acabou de ser liberado (estava desligado) — gera uma senha nova
  // pra enviar, já que não guardamos a anterior.
  if (acessoSistema && antes?.acesso_sistema === false) {
    const {
      data: { user },
    } = await admin.auth.admin.getUserById(id);
    if (user?.email) {
      const senha = gerarSenhaAleatoria();
      const { error: senhaError } = await admin.auth.admin.updateUserById(id, { password: senha });
      if (senhaError) throw new Error(senhaError.message);
      revalidatePath("/painel/dp");
      return { credenciais: { nome, email: user.email, senha, whatsapp: telefone || null } };
    }
  }

  revalidatePath("/painel/dp");
  return { ok: true };
}

/** Gera uma senha nova pra pessoa que esqueceu a dela — mesma lógica usada
 * quando o acesso é reativado em editarPessoa, só que sob demanda. */
export async function redefinirSenha(usuarioId: string): Promise<Credenciais> {
  await requireRole(["gerencia"]);

  const admin = createAdminClient();
  const { data: perfil, error: perfilError } = await admin
    .from("usuarios_perfis")
    .select("nome, telefone")
    .eq("id", usuarioId)
    .single();
  if (perfilError || !perfil) throw new Error("Pessoa não encontrada.");

  const {
    data: { user },
  } = await admin.auth.admin.getUserById(usuarioId);
  if (!user?.email) throw new Error("Pessoa sem e-mail cadastrado.");

  const senha = gerarSenhaAleatoria();
  const { error } = await admin.auth.admin.updateUserById(usuarioId, { password: senha });
  if (error) throw new Error(error.message);

  return { nome: perfil.nome, email: user.email, senha, whatsapp: perfil.telefone };
}

export async function buscarEmailUsuario(usuarioId: string): Promise<string | null> {
  await requireRole(["gerencia"]);

  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.admin.getUserById(usuarioId);
  return user?.email ?? null;
}

/** E-mail é o login da pessoa — troca fica separada do "Salvar" geral pra
 * nunca mudar sem querer junto com outros campos do cadastro. */
export async function alterarEmailUsuario(usuarioId: string, novoEmail: string): Promise<{ email: string }> {
  const { perfil } = await requireRole(["gerencia"]);

  const email = novoEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Informe um e-mail válido.");

  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.admin.getUserById(usuarioId);
  if (!user) throw new Error("Pessoa não encontrada.");
  if (user.email === email) return { email };

  const { data, error } = await admin.auth.admin.updateUserById(usuarioId, { email, email_confirm: true });
  if (error) {
    if (error.code === "email_exists") throw new Error("Esse e-mail já está em uso por outra conta.");
    throw new Error(error.message);
  }

  await registrarAuditoria({
    usuarioId: perfil.id,
    acao: "alterar_email_pessoa",
    entidade: "pessoa",
    entidadeId: usuarioId,
    detalhes: { emailAnterior: user.email, emailNovo: email },
  });

  return { email: data.user?.email ?? email };
}

export async function salvarUsuarioKpis(formData: FormData) {
  await requireRole(["gerencia"]);

  const usuarioId = String(formData.get("usuario_id") ?? "");
  if (!usuarioId) throw new Error("Pessoa inválida.");

  const paraCargo: string[] = [];
  const paraUpsert: { usuario_id: string; kpi_secao: string; visivel: boolean }[] = [];
  for (const secao of KPI_SECOES) {
    const valor = String(formData.get(`kpi_${secao.key}`) ?? "cargo");
    if (valor === "cargo") paraCargo.push(secao.key);
    else paraUpsert.push({ usuario_id: usuarioId, kpi_secao: secao.key, visivel: valor === "mostrar" });
  }

  const admin = createAdminClient();
  const [resultadoDelete, resultadoUpsert] = await Promise.all([
    paraCargo.length
      ? admin.from("usuarios_kpis").delete().eq("usuario_id", usuarioId).in("kpi_secao", paraCargo)
      : Promise.resolve({ error: null }),
    paraUpsert.length
      ? admin.from("usuarios_kpis").upsert(paraUpsert, { onConflict: "usuario_id,kpi_secao" })
      : Promise.resolve({ error: null }),
  ]);
  if (resultadoDelete.error) throw new Error(resultadoDelete.error.message);
  if (resultadoUpsert.error) throw new Error(resultadoUpsert.error.message);

  revalidatePath(`/painel/dp/${usuarioId}/editar`);
  revalidatePath("/painel");
}

export async function criarFuncao(formData: FormData) {
  await requireRole(["gerencia"]);

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const nivelAcesso = String(formData.get("nivel_acesso") ?? "");
  if (!nome || !nivelAcesso) throw new Error("Preencha o nome e o nível de acesso da função.");
  if (descricaoEstaVazia(descricao)) throw new Error("Preencha a descrição das responsabilidades.");

  const admin = createAdminClient();
  const { error } = await admin.from("funcoes").insert({ nome, descricao, nivel_acesso: nivelAcesso });
  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma função com esse nome.");
    throw new Error(error.message);
  }

  revalidatePath("/painel/dp/funcoes");
}

export async function atualizarFuncao(formData: FormData) {
  await requireRole(["gerencia"]);

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const nivelAcesso = String(formData.get("nivel_acesso") ?? "");
  if (!id || !nome || !nivelAcesso) throw new Error("Preencha o nome e o nível de acesso da função.");
  if (descricaoEstaVazia(descricao)) throw new Error("Preencha a descrição das responsabilidades.");

  const admin = createAdminClient();
  const { error } = await admin
    .from("funcoes")
    .update({ nome, descricao, nivel_acesso: nivelAcesso })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Já existe uma função com esse nome.");
    throw new Error(error.message);
  }

  revalidatePath("/painel/dp/funcoes");
  revalidatePath(`/painel/dp/funcoes/${id}`);
}

export async function excluirFuncao(id: string) {
  await requireRole(["gerencia"]);

  const admin = createAdminClient();
  const { error } = await admin.from("funcoes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/dp/funcoes");
  redirect("/painel/dp/funcoes");
}
