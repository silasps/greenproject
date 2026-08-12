"use server";

import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { canGerenciarClientes } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularValorTotal } from "@/lib/orcamento/calcular";
import { gerarPropostaPdf } from "@/lib/orcamento/gerar-pdf";
import { onlyDigits } from "@/lib/utils/mascaras";
import { enviarEmail } from "@/lib/email/enviar";
import { COMPANY } from "@/lib/legal/company-info";
import { registrarAuditoria } from "@/lib/auditoria/registrar";
import { CORES_AGENDA } from "./cores";

type Admin = ReturnType<typeof createAdminClient>;

/** Campos do veículo novo — usado tanto no cadastro completo quanto quando o cliente já existe. */
function extrairVeiculoNovo(formData: FormData) {
  const identificador = String(formData.get("veiculo_identificador") ?? "").trim();
  if (!identificador) return null;
  return {
    tipo_ativo: String(formData.get("veiculo_tipo_ativo") ?? "veiculo") as "veiculo" | "maquina_equipamento",
    identificador,
    marca: String(formData.get("veiculo_marca") ?? "").trim() || null,
    modelo: String(formData.get("veiculo_modelo") ?? "").trim() || null,
    chassi: String(formData.get("veiculo_chassi") ?? "").trim() || null,
    renavam: String(formData.get("veiculo_renavam") ?? "").trim() || null,
  };
}

/** Cadastro de cliente/veículo preenchido direto no orçamento (opcional). */
function extrairCadastroClienteVeiculo(formData: FormData) {
  if (formData.get("cadastro_cliente") !== "on") return null;
  const cnpjCpf = onlyDigits(String(formData.get("cliente_cnpj_cpf") ?? ""));
  const nome = String(formData.get("cliente_nome") ?? "").trim();
  if (!cnpjCpf || !nome) return null;
  return {
    cliente: {
      tipo: String(formData.get("cliente_tipo") ?? "pj") as "pj" | "pf",
      cnpj_cpf: cnpjCpf,
      nome,
      endereco: String(formData.get("cliente_endereco") ?? "").trim() || null,
      email: String(formData.get("cliente_email") ?? "").trim() || null,
    },
    veiculo: extrairVeiculoNovo(formData),
  };
}

/**
 * Resolve cliente_id/veiculo_id pro agendamento: reusa cliente/veículo já
 * cadastrados quando a pessoa buscou um existente (evita duplicar CNPJ/CPF
 * e é o caminho de uma retestagem), cria cadastro novo quando preenchido no
 * orçamento, ou deixa o cliente "pendente" (só nome+telefone) pra completar depois.
 */
async function resolverClienteEVeiculo(
  admin: Admin,
  formData: FormData,
  fallback: { nomeContato: string; telefonePrincipal: string },
): Promise<{ clienteId: string; veiculoId: string | null }> {
  const clienteIdExistente = String(formData.get("cliente_id_existente") ?? "") || null;
  const veiculoIdExistente = String(formData.get("veiculo_id_existente") ?? "") || null;
  const cadastro = extrairCadastroClienteVeiculo(formData);

  let clienteId: string;
  if (clienteIdExistente) {
    clienteId = clienteIdExistente;
  } else {
    const { data: cliente, error } = await admin
      .from("clientes")
      .insert(
        cadastro
          ? { ...cadastro.cliente, telefone: fallback.telefonePrincipal, status: "completo" }
          : { nome: fallback.nomeContato, telefone: fallback.telefonePrincipal, status: "pendente" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    clienteId = cliente.id;
  }

  let veiculoId = veiculoIdExistente;
  if (!veiculoId) {
    const veiculoNovo = clienteIdExistente ? extrairVeiculoNovo(formData) : cadastro?.veiculo;
    if (veiculoNovo) {
      const { data: veiculo, error } = await admin
        .from("veiculos_maquinas")
        .insert({ ...veiculoNovo, cliente_id: clienteId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      veiculoId = veiculo.id;
    }
  }

  return { clienteId, veiculoId };
}

/** Cor estável por pessoa — mesmo hash sempre cai na mesma cor da paleta. */
function corPessoal(usuarioId: string): string {
  const hash = usuarioId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CORES_AGENDA[hash % CORES_AGENDA.length];
}

/**
 * Todo evento precisa de uma categoria — quando ninguém escolhe uma, cai na
 * categoria pessoal (nome da pessoa), criada sob demanda na primeira vez.
 */
async function obterOuCriarCategoriaPessoal(admin: Admin, perfil: { id: string; nome: string }): Promise<string> {
  const { data: existente } = await admin.from("categorias_agenda").select("id").eq("nome", perfil.nome).maybeSingle();
  if (existente) return existente.id;

  const { data: criada, error } = await admin
    .from("categorias_agenda")
    .insert({ nome: perfil.nome, cor: corPessoal(perfil.id), criado_por: perfil.id })
    .select("id")
    .single();
  if (!error) return criada.id;

  // Corrida rara: outra criação do mesmo evento pode ter inserido primeiro
  // (nome é unique) — tenta buscar de novo antes de desistir.
  const { data: retry } = await admin.from("categorias_agenda").select("id").eq("nome", perfil.nome).maybeSingle();
  if (retry) return retry.id;
  throw new Error(error.message);
}

const MAX_OCORRENCIAS = 52;

function proximaOcorrencia(data: Date, frequencia: string): Date {
  switch (frequencia) {
    case "diaria":
      return addDays(data, 1);
    case "semanal":
      return addWeeks(data, 1);
    case "mensal":
      return addMonths(data, 1);
    case "anual":
      return addYears(data, 1);
    case "dias_uteis": {
      let proxima = addDays(data, 1);
      while (proxima.getDay() === 0 || proxima.getDay() === 6) proxima = addDays(proxima, 1);
      return proxima;
    }
    default:
      return data;
  }
}

/** Materializa a série em ocorrências independentes — cada uma é um agendamento normal, editável/cancelável avulsamente. */
function gerarOcorrencias(inicio: Date, fim: Date, frequencia: string, repetirAte: Date | null) {
  if (frequencia === "nunca" || !repetirAte) return [{ inicio, fim }];
  const duracaoMs = fim.getTime() - inicio.getTime();
  const ocorrencias: { inicio: Date; fim: Date }[] = [];
  let atual = inicio;
  while (atual <= repetirAte && ocorrencias.length < MAX_OCORRENCIAS) {
    ocorrencias.push({ inicio: atual, fim: new Date(atual.getTime() + duracaoMs) });
    atual = proximaOcorrencia(atual, frequencia);
  }
  return ocorrencias;
}

/** Lê a lista de custos extras (JSON vindo do form) e descarta itens sem descrição/valor válido. */
function extrairCustosExtras(formData: FormData): { descricao: string; valor: number }[] {
  const bruto = String(formData.get("custos_extras") ?? "[]");
  let itens: unknown;
  try {
    itens = JSON.parse(bruto);
  } catch {
    return [];
  }
  if (!Array.isArray(itens)) return [];
  return itens
    .map((item) => ({
      descricao: String((item as { descricao?: unknown })?.descricao ?? "").trim(),
      valor: Number((item as { valor?: unknown })?.valor ?? 0),
    }))
    .filter((item) => item.descricao && Number.isFinite(item.valor));
}

function gerarToken() {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem chars ambíguos
  let codigo = "";
  for (let i = 0; i < 12; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    if (i % 4 === 3 && i !== 11) codigo += "-";
  }
  return codigo;
}

/**
 * Criação unificada da Agenda: por padrão cria um evento livre; marcando
 * "é um teste" vira o primeiro atendimento do pipeline comercial — cria um
 * cliente pendente (só nome+telefone), o agendamento e a proposta com o
 * orçamento calculado.
 */
export async function criarEvento(formData: FormData) {
  const { perfil } = await requireAuth();
  const eTeste = formData.get("e_teste") === "on";

  if (!eTeste) {
    const titulo = String(formData.get("titulo") ?? "").trim();
    const descricao = String(formData.get("descricao") ?? "").trim();
    const localizacao = String(formData.get("localizacao") ?? "").trim();
    const dataInicio = String(formData.get("data_inicio") ?? "");
    const horaInicio = String(formData.get("hora_inicio") ?? "");
    const dataFim = String(formData.get("data_fim") ?? "");
    const horaFim = String(formData.get("hora_fim") ?? "");
    const participantes = formData.getAll("participantes").map(String).filter(Boolean);
    const repetir = String(formData.get("repetir") ?? "nunca");
    const repetirAte = String(formData.get("repetir_ate") ?? "");
    const categoriaId = String(formData.get("categoria_id") ?? "") || null;

    if (!titulo || !dataInicio || !horaInicio || !dataFim || !horaFim) {
      throw new Error("Preencha o título e o início/fim do evento.");
    }
    if (repetir !== "nunca" && !repetirAte) {
      throw new Error("Informe até quando o evento deve se repetir.");
    }

    const ocorrencias = gerarOcorrencias(
      new Date(`${dataInicio}T${horaInicio}`),
      new Date(`${dataFim}T${horaFim}`),
      repetir,
      repetirAte ? new Date(`${repetirAte}T23:59`) : null,
    );

    const admin = createAdminClient();
    const categoriaFinal = categoriaId ?? (await obterOuCriarCategoriaPessoal(admin, perfil));
    const { data: eventos, error } = await admin
      .from("agendamentos")
      .insert(
        ocorrencias.map(({ inicio, fim }) => ({
          tipo: "evento",
          titulo,
          descricao: descricao || null,
          endereco: localizacao || null,
          data_hora: inicio.toISOString(),
          data_hora_fim: fim.toISOString(),
          criado_por: perfil.id,
          categoria_id: categoriaFinal,
        })),
      )
      .select("id");
    if (error) throw new Error(error.message);

    if (participantes.length > 0) {
      const { error: participantesError } = await admin.from("agendamento_participantes").insert(
        (eventos ?? []).flatMap((evento) =>
          participantes.map((usuarioId) => ({ agendamento_id: evento.id, usuario_id: usuarioId })),
        ),
      );
      if (participantesError) throw new Error(participantesError.message);
    }

    revalidatePath("/painel/agenda");
    return;
  }

  if (!canGerenciarClientes(perfil.role)) {
    throw new Error("Sem permissão para agendar teste.");
  }

  const nomeContato = String(formData.get("nome_contato") ?? "").trim();
  const telefoneContato = String(formData.get("telefone_contato") ?? "").trim();
  const whatsappContato = String(formData.get("whatsapp_contato") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  const horaFim = String(formData.get("hora_fim") ?? "");
  const cep = String(formData.get("cep") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const categoriaId = String(formData.get("categoria_id") ?? "") || null;
  const kmIdaVolta = Number(formData.get("km_ida_volta") ?? 0);
  const valorKm = Number(formData.get("valor_km") ?? 0);
  const pedagio = Number(formData.get("pedagio") ?? 0);
  const alimentacao = Number(formData.get("alimentacao") ?? 0);
  const valorServico = Number(formData.get("valor_servico") ?? 0);
  const tipoServicoId = String(formData.get("tipo_servico_id") ?? "") || null;
  const custosExtras = extrairCustosExtras(formData);

  // Só um dos dois é obrigatório — WhatsApp é o meio de contato principal,
  // então serve de telefone quando o campo de telefone fica em branco.
  const telefonePrincipal = telefoneContato || whatsappContato;

  if (!nomeContato || !telefonePrincipal || !dataInicio || !horaInicio || !dataFim || !horaFim) {
    throw new Error("Preencha nome, telefone ou WhatsApp, e início/fim do teste.");
  }

  const valorTotal = calcularValorTotal({ kmIdaVolta, valorKm, pedagio, alimentacao, valorServico, custosExtras });

  const admin = createAdminClient();
  const categoriaFinal = categoriaId ?? (await obterOuCriarCategoriaPessoal(admin, perfil));

  const { clienteId, veiculoId } = await resolverClienteEVeiculo(admin, formData, { nomeContato, telefonePrincipal });

  const { data: agendamento, error: agendamentoError } = await admin
    .from("agendamentos")
    .insert({
      tipo: "teste_opacidade",
      cliente_id: clienteId,
      veiculo_id: veiculoId,
      nome_contato: nomeContato,
      telefone_contato: telefonePrincipal,
      whatsapp_contato: whatsappContato || null,
      tipo_teste: "opacidade",
      tipo_servico_id: tipoServicoId,
      cep: cep || null,
      endereco: endereco || null,
      numero: numero || null,
      data_hora: new Date(`${dataInicio}T${horaInicio}`).toISOString(),
      data_hora_fim: new Date(`${dataFim}T${horaFim}`).toISOString(),
      categoria_id: categoriaFinal,
    })
    .select("id")
    .single();
  if (agendamentoError) throw new Error(agendamentoError.message);

  const { data: proposta, error: propostaError } = await admin
    .from("propostas")
    .insert({
      cliente_id: clienteId,
      agendamento_id: agendamento.id,
      km_ida_volta: kmIdaVolta,
      valor_km: valorKm,
      pedagio,
      alimentacao,
      valor_servico: valorServico,
      custos_extras: custosExtras,
      valor_total: valorTotal,
      token: gerarToken(),
    })
    .select("id")
    .single();
  if (propostaError) throw new Error(propostaError.message);

  await admin.from("agendamentos").update({ proposta_id: proposta.id }).eq("id", agendamento.id);

  revalidatePath("/painel/agenda");
  redirect(`/painel/agenda/${agendamento.id}`);
}

/** Edita um evento — só quem criou pode. */
export async function atualizarEvento(id: string, formData: FormData) {
  const { perfil } = await requireAuth();
  const admin = createAdminClient();

  const { data: existente, error: buscaError } = await admin
    .from("agendamentos")
    .select("criado_por")
    .eq("id", id)
    .eq("tipo", "evento")
    .single();
  if (buscaError) throw new Error(buscaError.message);
  if (existente.criado_por !== perfil.id) throw new Error("Só quem criou o evento pode editá-lo.");

  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const localizacao = String(formData.get("localizacao") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  const horaFim = String(formData.get("hora_fim") ?? "");
  const participantes = formData.getAll("participantes").map(String).filter(Boolean);
  const categoriaId = String(formData.get("categoria_id") ?? "") || null;

  if (!titulo || !dataInicio || !horaInicio || !dataFim || !horaFim) {
    throw new Error("Preencha o título e o início/fim do evento.");
  }

  const categoriaFinal = categoriaId ?? (await obterOuCriarCategoriaPessoal(admin, perfil));
  const { error } = await admin
    .from("agendamentos")
    .update({
      titulo,
      descricao: descricao || null,
      endereco: localizacao || null,
      data_hora: new Date(`${dataInicio}T${horaInicio}`).toISOString(),
      data_hora_fim: new Date(`${dataFim}T${horaFim}`).toISOString(),
      categoria_id: categoriaFinal,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const { error: delError } = await admin.from("agendamento_participantes").delete().eq("agendamento_id", id);
  if (delError) throw new Error(delError.message);

  if (participantes.length > 0) {
    const { error: insError } = await admin
      .from("agendamento_participantes")
      .insert(participantes.map((usuarioId) => ({ agendamento_id: id, usuario_id: usuarioId })));
    if (insError) throw new Error(insError.message);
  }

  revalidatePath("/painel/agenda");
  revalidatePath(`/painel/agenda/${id}`);
}

/** Corrige nome/telefone/WhatsApp do contato de um teste já agendado (ex.: erro de digitação) — não mexe em data, endereço, veículo ou proposta. */
export async function atualizarContatoAgendamento(agendamentoId: string, formData: FormData) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) {
    throw new Error("Sem permissão para editar o contato.");
  }

  const nomeContato = String(formData.get("nome_contato") ?? "").trim();
  const telefoneContato = String(formData.get("telefone_contato") ?? "").trim();
  const whatsappContato = String(formData.get("whatsapp_contato") ?? "").trim();
  // Mesma regra de criarEvento: WhatsApp serve de telefone quando o campo de telefone fica em branco.
  const telefonePrincipal = telefoneContato || whatsappContato;

  if (!nomeContato || !telefonePrincipal) {
    throw new Error("Preencha o nome e o telefone ou WhatsApp.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("agendamentos")
    .update({
      nome_contato: nomeContato,
      telefone_contato: telefonePrincipal,
      whatsapp_contato: whatsappContato || null,
    })
    .eq("id", agendamentoId)
    .eq("tipo", "teste_opacidade");
  if (error) throw new Error(error.message);

  revalidatePath(`/painel/agenda/${agendamentoId}`);
  revalidatePath("/painel/agenda");
}

/**
 * Converte um evento criado por engano em agendamento de teste — mesma
 * lógica do ramo "teste" de criarEvento, mas atualizando o registro
 * existente em vez de inserir um novo (preserva o mesmo id/lugar na agenda).
 */
export async function converterEventoParaTeste(id: string, formData: FormData) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) throw new Error("Sem permissão para agendar teste.");

  const admin = createAdminClient();
  const { data: existente, error: buscaError } = await admin
    .from("agendamentos")
    .select("criado_por, tipo")
    .eq("id", id)
    .single();
  if (buscaError) throw new Error(buscaError.message);
  if (existente.tipo !== "evento") throw new Error("Este agendamento já não é mais um evento.");
  if (existente.criado_por !== perfil.id) throw new Error("Só quem criou o evento pode convertê-lo.");

  const nomeContato = String(formData.get("nome_contato") ?? "").trim();
  const telefoneContato = String(formData.get("telefone_contato") ?? "").trim();
  const whatsappContato = String(formData.get("whatsapp_contato") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  const horaFim = String(formData.get("hora_fim") ?? "");
  const cep = String(formData.get("cep") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();
  const numero = String(formData.get("numero") ?? "").trim();
  const categoriaId = String(formData.get("categoria_id") ?? "") || null;
  const kmIdaVolta = Number(formData.get("km_ida_volta") ?? 0);
  const valorKm = Number(formData.get("valor_km") ?? 0);
  const pedagio = Number(formData.get("pedagio") ?? 0);
  const alimentacao = Number(formData.get("alimentacao") ?? 0);
  const valorServico = Number(formData.get("valor_servico") ?? 0);
  const tipoServicoId = String(formData.get("tipo_servico_id") ?? "") || null;
  const custosExtras = extrairCustosExtras(formData);

  const telefonePrincipal = telefoneContato || whatsappContato;

  if (!nomeContato || !telefonePrincipal || !dataInicio || !horaInicio || !dataFim || !horaFim) {
    throw new Error("Preencha nome, telefone ou WhatsApp, e início/fim do teste.");
  }

  const valorTotal = calcularValorTotal({ kmIdaVolta, valorKm, pedagio, alimentacao, valorServico, custosExtras });
  const categoriaFinal = categoriaId ?? (await obterOuCriarCategoriaPessoal(admin, perfil));

  const { clienteId, veiculoId } = await resolverClienteEVeiculo(admin, formData, { nomeContato, telefonePrincipal });

  const { error: agendamentoError } = await admin
    .from("agendamentos")
    .update({
      tipo: "teste_opacidade",
      titulo: null,
      descricao: null,
      cliente_id: clienteId,
      veiculo_id: veiculoId,
      nome_contato: nomeContato,
      telefone_contato: telefonePrincipal,
      whatsapp_contato: whatsappContato || null,
      tipo_teste: "opacidade",
      tipo_servico_id: tipoServicoId,
      cep: cep || null,
      endereco: endereco || null,
      numero: numero || null,
      data_hora: new Date(`${dataInicio}T${horaInicio}`).toISOString(),
      data_hora_fim: new Date(`${dataFim}T${horaFim}`).toISOString(),
      categoria_id: categoriaFinal,
    })
    .eq("id", id);
  if (agendamentoError) throw new Error(agendamentoError.message);

  await admin.from("agendamento_participantes").delete().eq("agendamento_id", id);

  const { data: proposta, error: propostaError } = await admin
    .from("propostas")
    .insert({
      cliente_id: clienteId,
      agendamento_id: id,
      km_ida_volta: kmIdaVolta,
      valor_km: valorKm,
      pedagio,
      alimentacao,
      valor_servico: valorServico,
      custos_extras: custosExtras,
      valor_total: valorTotal,
      token: gerarToken(),
    })
    .select("id")
    .single();
  if (propostaError) throw new Error(propostaError.message);

  await admin.from("agendamentos").update({ proposta_id: proposta.id }).eq("id", id);

  revalidatePath("/painel/agenda");
  redirect(`/painel/agenda/${id}`);
}

/** Exclui um evento — só quem criou pode. Participantes somem junto (cascade). */
export async function excluirEvento(id: string) {
  const { perfil } = await requireAuth();
  const admin = createAdminClient();

  const { data: existente, error: buscaError } = await admin
    .from("agendamentos")
    .select("criado_por")
    .eq("id", id)
    .eq("tipo", "evento")
    .single();
  if (buscaError) throw new Error(buscaError.message);
  if (existente.criado_por !== perfil.id) throw new Error("Só quem criou o evento pode excluí-lo.");

  const { error } = await admin.from("agendamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/painel/agenda");
}

/**
 * Exclusão de verdade (não lógica) do agendamento de um teste de opacidade —
 * cascade já apaga testes_opacidade/medições/laudo (ver schema, seção 6.14).
 * Só gerência (cargo mais alto hoje) pode excluir, e só se não houver laudo
 * liberado: laudo é documento oficial com link de verificação pública, não
 * dá pra sumir com ele por baixo do pano — nesse caso a exclusão é bloqueada.
 */
export async function excluirTeste(agendamentoId: string) {
  const { perfil } = await requireRole(["gerencia"]);
  const admin = createAdminClient();

  const { data: existente, error: buscaError } = await admin
    .from("agendamentos")
    .select("id, testes_opacidade(laudos(id))")
    .eq("id", agendamentoId)
    .eq("tipo", "teste_opacidade")
    .single();
  if (buscaError || !existente) throw new Error("Teste não encontrado.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temLaudo = (existente.testes_opacidade as any[])?.some((t) => t.laudos?.length > 0);
  if (temLaudo) throw new Error("Esse teste já tem laudo liberado — não é possível excluir.");

  const { error } = await admin.from("agendamentos").delete().eq("id", agendamentoId);
  if (error) throw new Error(error.message);

  await registrarAuditoria({
    usuarioId: perfil.id,
    acao: "excluir_teste",
    entidade: "agendamento",
    entidadeId: agendamentoId,
  });

  redirect("/painel/agenda");
}

/** Cria (se não existir) e retorna o teste de opacidade vinculado a um agendamento. */
export async function obterOuCriarTeste(agendamentoId: string) {
  await requireAuth();
  const admin = createAdminClient();

  const { data: existente } = await admin
    .from("testes_opacidade")
    .select("id")
    .eq("agendamento_id", agendamentoId)
    .maybeSingle();

  if (existente) return existente.id as string;

  const { data: agendamento, error: agError } = await admin
    .from("agendamentos")
    .select("veiculo_id")
    .eq("id", agendamentoId)
    .single();
  if (agError) throw new Error(agError.message);

  const { data: criado, error } = await admin
    .from("testes_opacidade")
    .insert({ agendamento_id: agendamentoId, veiculo_id: agendamento.veiculo_id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return criado.id as string;
}

/** Vincula o veículo escolhido ao agendamento (etapa de cadastro completo). */
export async function vincularVeiculo(formData: FormData) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) throw new Error("Sem permissão.");

  const agendamentoId = String(formData.get("agendamento_id"));
  const veiculoId = String(formData.get("veiculo_id"));
  if (!agendamentoId || !veiculoId) throw new Error("Selecione um veículo.");

  const admin = createAdminClient();
  const { error } = await admin.from("agendamentos").update({ veiculo_id: veiculoId }).eq("id", agendamentoId);
  if (error) throw new Error(error.message);

  revalidatePath(`/painel/agenda/${agendamentoId}`);
}

/** Move o agendamento pra fase de execução do teste (cria o teste e redireciona). */
export async function iniciarExecucaoTeste(agendamentoId: string) {
  const testeId = await obterOuCriarTeste(agendamentoId);
  redirect(`/painel/testes/${testeId}`);
}

/** Emite o PDF da proposta — só depois do cadastro do cliente estar completo. */
export async function emitirPropostaPdf(agendamentoId: string) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) throw new Error("Sem permissão.");

  const admin = createAdminClient();
  const { data: agendamento, error } = await admin
    .from("agendamentos")
    .select(
      "proposta_id, data_hora, cep, endereco, numero, clientes(nome, status), veiculos_maquinas(identificador, marca, modelo)",
    )
    .eq("id", agendamentoId)
    .single();
  if (error) throw new Error(error.message);
  if (!agendamento.proposta_id) throw new Error("Este agendamento não tem proposta.");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = agendamento.clientes as any;
  if (!cliente || cliente.status !== "completo") {
    throw new Error("Complete o cadastro do cliente antes de emitir a proposta.");
  }

  const { data: proposta, error: propostaError } = await admin
    .from("propostas")
    .select("id, token, km_ida_volta, valor_km, pedagio, alimentacao, valor_servico, custos_extras, valor_total")
    .eq("id", agendamento.proposta_id)
    .single();
  if (propostaError) throw new Error(propostaError.message);

  const { data: dadosEmpresa, error: empresaError } = await admin
    .from("dados_empresa")
    .select("razao_social, cnpj, endereco, telefone")
    .single();
  if (empresaError) throw new Error(empresaError.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const veiculo = agendamento.veiculos_maquinas as any;
  const veiculoLabel = veiculo ? `${veiculo.marca ?? ""} ${veiculo.modelo ?? ""} - ${veiculo.identificador}`.trim() : "";
  const dataHoraTexto = format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  const local = agendamento.endereco
    ? `${agendamento.endereco}${agendamento.numero ? `, ${agendamento.numero}` : ""}${agendamento.cep ? ` · CEP ${agendamento.cep}` : ""}`
    : "Na empresa (Greenproject)";

  const pdfBytes = await gerarPropostaPdf({
    proposta,
    clienteNome: cliente.nome,
    veiculoLabel,
    dataHoraTexto,
    local,
    token: proposta.token,
    empresa: {
      razaoSocial: dadosEmpresa.razao_social,
      cnpj: dadosEmpresa.cnpj,
      endereco: dadosEmpresa.endereco,
      telefone: dadosEmpresa.telefone,
    },
  });

  const pdfPath = `${proposta.token}.pdf`;
  const { error: uploadError } = await admin.storage.from("propostas").upload(pdfPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error: updateError } = await admin.from("propostas").update({ pdf_path: pdfPath }).eq("id", proposta.id);
  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/painel/agenda/${agendamentoId}`);
}

/** Reenvia a proposta por e-mail — usa o link público (mesma página que o WhatsApp manda). */
export async function reenviarPropostaEmail(agendamentoId: string) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) throw new Error("Sem permissão.");

  const admin = createAdminClient();
  const { data: agendamento, error } = await admin
    .from("agendamentos")
    .select("clientes(nome, email), proposta:propostas!proposta_id(token, valor_total)")
    .eq("id", agendamentoId)
    .single();
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = agendamento.clientes as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposta = agendamento.proposta as any;
  if (!proposta) throw new Error("Este agendamento não tem proposta.");
  if (!cliente?.email) throw new Error("Cliente não tem e-mail cadastrado.");

  const valor = proposta.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const link = `${COMPANY.siteUrl}/proposta/${proposta.token}`;

  await enviarEmail({
    para: cliente.email,
    assunto: "Orçamento do teste de opacidade — Greenproject Engenharia",
    html: `
      <p>Olá ${cliente.nome ?? ""},</p>
      <p>Segue o orçamento do teste de opacidade: <strong>${valor}</strong>.</p>
      <p><a href="${link}">Ver detalhes e aceitar a proposta</a></p>
      <p>Qualquer dúvida, estamos à disposição — ${COMPANY.razaoSocial}.</p>
    `,
  });
}

/** Marca a proposta como aceita em nome do cliente — pra quando o aceite acontece por telefone/presencial, sem passar pelo link público. */
export type CanalAceiteProposta = "email" | "whatsapp" | "presencial" | "outro";

export async function aceitarPropostaComoStaff(
  agendamentoId: string,
  canal: CanalAceiteProposta,
  detalhe?: string,
) {
  const { perfil } = await requireAuth();
  if (!canGerenciarClientes(perfil.role)) throw new Error("Sem permissão.");

  const admin = createAdminClient();
  const { data: agendamento, error } = await admin
    .from("agendamentos")
    .select("proposta:propostas!proposta_id(id, status, token)")
    .eq("id", agendamentoId)
    .single();
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposta = agendamento.proposta as any;
  if (!proposta || proposta.status !== "enviada") {
    throw new Error("Proposta não encontrada ou já processada.");
  }

  const { error: updateError } = await admin
    .from("propostas")
    .update({
      status: "aceita",
      evidencia_aceite: {
        via: "staff",
        canal,
        detalhe: detalhe || null,
        aceito_por: perfil.nome,
        aceito_em: new Date().toISOString(),
      },
    })
    .eq("id", proposta.id);
  if (updateError) throw new Error(updateError.message);

  await registrarAuditoria({
    usuarioId: perfil.id,
    acao: "aceitar_proposta_como_staff",
    entidade: "proposta",
    entidadeId: proposta.id,
    detalhes: { canal, detalhe: detalhe || null },
  });

  revalidatePath(`/painel/agenda/${agendamentoId}`);
  revalidatePath(`/proposta/${proposta.token}`);
}
