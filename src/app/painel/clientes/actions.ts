"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { onlyDigits, isValidCpf, isValidCnpj } from "@/lib/utils/documento";
import { registrarAuditoria } from "@/lib/auditoria/registrar";

export async function salvarCliente(formData: FormData) {
  const { perfil } = await requireRole(["escritorio", "gerencia"]);

  const id = String(formData.get("id") || "");
  const tipo = String(formData.get("tipo"));
  const cnpjCpf = onlyDigits(String(formData.get("cnpj_cpf")));
  const nome = String(formData.get("nome")).trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!nome) throw new Error("Nome/razão social é obrigatório.");
  if (tipo === "pj" && !isValidCnpj(cnpjCpf)) throw new Error("CNPJ inválido.");
  if (tipo === "pf" && !isValidCpf(cnpjCpf)) throw new Error("CPF inválido.");

  const admin = createAdminClient();
  // Salvar aqui sempre exige tipo (pj/pf) + CNPJ/CPF válidos (checado acima),
  // então qualquer save por este form completa o cadastro de um cliente
  // pendente (criado só com nome+telefone no primeiro atendimento).
  const payload = { tipo, cnpj_cpf: cnpjCpf, nome, endereco, telefone, email, status: "completo" as const };

  if (id) {
    const { error } = await admin.from("clientes").update(payload).eq("id", id);
    if (error) throw new Error(mensagemErroCliente(error));
    await registrarAuditoria({ usuarioId: perfil.id, acao: "editar_cliente", entidade: "cliente", entidadeId: id });
    revalidatePath(`/painel/clientes/${id}`);
    const voltar = String(formData.get("voltar") || "");
    redirect(voltar || `/painel/clientes/${id}`);
  } else {
    const { data, error } = await admin.from("clientes").insert(payload).select("id").single();
    if (error) throw new Error(mensagemErroCliente(error));
    revalidatePath("/painel/clientes");
    redirect(`/painel/clientes/${data.id}`);
  }
}

function mensagemErroCliente(error: { code?: string; message: string }) {
  if (error.code === "23505" && error.message.includes("clientes_cnpj_cpf_key")) {
    return "Já existe um cliente cadastrado com esse CNPJ/CPF.";
  }
  return error.message;
}
