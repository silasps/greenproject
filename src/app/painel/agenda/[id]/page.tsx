import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  User,
  MapPin,
  Wallet,
  Car,
  MessageCircle,
  FileText,
  Play,
  Handshake,
  ListChecks,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { canGerenciarClientes, canExcluirTeste } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/legal/company-info";
import { onlyDigits } from "@/lib/utils/mascaras";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { iniciarExecucaoTeste, vincularVeiculo, emitirPropostaPdf, excluirTeste } from "../actions";
import { AceitarPropostaButton } from "../aceitar-proposta-button";
import { ReenviarEmailButton } from "./reenviar-email-button";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<string, string> = { enviada: "Aguardando aceite", aceita: "Aceita", expirada: "Expirada" };
const STATUS_CLASSE: Record<string, string> = {
  enviada: "bg-amber-100 text-amber-800",
  aceita: "bg-green-100 text-green-800",
  expirada: "bg-neutral-100 text-neutral-600",
};

type SubPasso = { label: string; feito: boolean; href?: string };

type Passo = {
  label: string;
  feito: boolean;
  href?: string;
  icon: LucideIcon;
  /** Botão pra realizar esse passo agora, quando disponível (independente dos outros — ex.: dá pra iniciar a execução mesmo com a proposta ainda não aceita). */
  acao?: ReactNode;
  /** Sub-etapas dentro desse passo (hoje só "Execução do teste" tem — o que rola em campo/escritório até o laudo sair). */
  subpassos?: SubPasso[];
};

function SubPassos({ subpassos }: { subpassos: SubPasso[] }) {
  return (
    <ul className="space-y-1.5">
      {subpassos.map((sp, i) => {
        const conteudo = (
          <>
            {sp.feito ? (
              <CheckCircle2 className="size-4 shrink-0 text-brand" />
            ) : (
              <Circle className="size-4 shrink-0 text-neutral-300" />
            )}
            <span className={sp.feito ? "text-neutral-400 line-through" : "text-neutral-700"}>{sp.label}</span>
          </>
        );
        return (
          <li key={i}>
            {sp.href ? (
              <Link href={sp.href} className="flex items-center gap-2 text-sm hover:underline">
                {conteudo}
              </Link>
            ) : (
              <span className="flex items-center gap-2 text-sm">{conteudo}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Bolinha({ passo, atual }: { passo: Passo; atual: boolean }) {
  return (
    <passo.icon
      className={cn(
        "size-8 shrink-0 rounded-full border-4 border-white p-1.5 shadow-sm",
        passo.feito
          ? "bg-brand text-white"
          : atual
            ? "bg-white text-brand ring-2 ring-brand"
            : "bg-white text-neutral-300 ring-2 ring-neutral-200",
      )}
    />
  );
}

/**
 * Passo a passo do teste: uma única timeline vertical (bolinha + linha
 * conectora + rótulo), igual em qualquer tamanho de tela — a coluna só fica
 * mais estreita no celular, não precisa de uma disposição alternativa. Toda
 * bolinha é clicável e navega/rola pra área correspondente, mesmo as já
 * concluídas, pra dar pra editar. A bolinha do passo atual (primeiro não
 * concluído) fica sem preenchimento, só o ícone em verde — diferencia de
 * "concluído" (preenchido) e "ainda não chegou lá" (contorno cinza).
 */
function PassoAPasso({ passos }: { passos: Passo[] }) {
  const total = passos.length;
  const atualIndex = passos.findIndex((p) => !p.feito);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex items-center gap-2 text-base font-semibold text-neutral-900">
        <ListChecks className="size-5 text-brand" />
        Passo a passo pra concluir
      </div>

      <ol className="mt-6">
        {passos.map((passo, i) => (
          <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
            {i < total - 1 && (
              <span
                className={cn(
                  "absolute top-8 bottom-0 left-4 -ml-px w-0.5",
                  passo.feito ? "bg-brand/30" : "bg-neutral-200",
                )}
              />
            )}
            <Link href={passo.href ?? "#"} aria-label={passo.label} title={passo.label} className="relative z-10 shrink-0">
              <Bolinha passo={passo} atual={i === atualIndex} />
            </Link>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <Link
                  href={passo.href ?? "#"}
                  className={cn(
                    "text-sm",
                    passo.feito ? "text-neutral-500" : i === atualIndex ? "font-medium text-neutral-900" : "text-neutral-400",
                  )}
                >
                  {passo.label}
                </Link>
                {passo.acao}
              </div>
              {passo.subpassos && (
                <div className="mt-3 rounded-lg border border-neutral-100 bg-neutral-50/60 p-3">
                  <SubPassos subpassos={passo.subpassos} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Cartao({
  icon: Icon,
  titulo,
  id,
  children,
}: {
  icon: typeof User;
  titulo: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        <Icon className="size-4 text-brand" />
        {titulo}
      </div>
      <div className="mt-2 text-base font-medium text-neutral-900">{children}</div>
    </div>
  );
}

export default async function AgendamentoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  const { perfil } = await requireAuth();
  const { id } = await params;
  const { voltar } = await searchParams;
  const voltarPara = voltar || "/painel/agenda";
  const supabase = await createClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select(
      "id, tipo, titulo, descricao, data_hora, data_hora_fim, nome_contato, telefone_contato, whatsapp_contato, cep, endereco, numero, cliente_id, veiculo_id, agendamento_participantes(usuarios_perfis(nome)), clientes(id, nome, telefone, email, status), veiculos_maquinas(identificador, marca, modelo), tipos_servico(nome), proposta:propostas!proposta_id(token, valor_total, status, pdf_path), testes_opacidade(id, status, laudos(emitido_em))",
    )
    .eq("id", id)
    .single();

  if (!agendamento) notFound();

  if (agendamento.tipo === "evento") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const participantes = ((agendamento.agendamento_participantes ?? []) as any[])
      .map((p) => p.usuarios_perfis?.nome)
      .filter(Boolean);

    // Edição/exclusão acontecem pelo modal ao clicar no evento na Agenda —
    // este link direto é só uma visualização (útil pra compartilhar).
    return (
      <div className="mx-auto max-w-lg lg:max-w-2xl xl:max-w-3xl">
        <Link
          href={voltarPara}
          className="flex w-fit items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{agendamento.titulo}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-neutral-500">
          <Calendar className="size-4" />
          {format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          {agendamento.data_hora_fim &&
            ` – ${format(new Date(agendamento.data_hora_fim), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}`}
        </p>
        <div className="mt-4 space-y-4">
          {agendamento.endereco && (
            <Cartao icon={MapPin} titulo="Localização">
              <p className="text-neutral-900">{agendamento.endereco}</p>
            </Cartao>
          )}
          {agendamento.descricao && (
            <Cartao icon={FileText} titulo="Descrição">
              <p className="whitespace-pre-wrap text-neutral-700">{agendamento.descricao}</p>
            </Cartao>
          )}
          {participantes.length > 0 && (
            <Cartao icon={User} titulo="Participantes">
              <p className="text-neutral-700">{participantes.join(", ")}</p>
            </Cartao>
          )}
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = agendamento.clientes as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposta = agendamento.proposta as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const veiculo = agendamento.veiculos_maquinas as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nomeServico = (agendamento.tipos_servico as any)?.nome ?? "Teste de Opacidade";
  const execucaoIniciada = (agendamento.testes_opacidade?.length ?? 0) > 0;
  const podeGerenciar = canGerenciarClientes(perfil.role);

  const testeId = agendamento.testes_opacidade?.[0]?.id;
  const testeStatus = agendamento.testes_opacidade?.[0]?.status;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const laudoRel = (agendamento.testes_opacidade?.[0] as any)?.laudos;
  const emitidoEm: string | undefined = Array.isArray(laudoRel) ? laudoRel[0]?.emitido_em : laudoRel?.emitido_em;
  const validadeLaudo = emitidoEm ? new Date(emitidoEm) : null;
  if (validadeLaudo) validadeLaudo.setFullYear(validadeLaudo.getFullYear() + 1);
  // Sub-etapas do que acontece depois que a execução em campo começa —
  // status do testes_opacidade (ver testes/[testeId]/page.tsx): fotos e
  // medição em campo → PDF do opacímetro importado (escritório) → laudo
  // revisado e liberado (gerência).
  const subpassosExecucao: SubPasso[] | undefined = execucaoIniciada
    ? [
        {
          label: "Fotos e medição em campo enviadas",
          feito: testeStatus !== "aguardando_execucao",
          // Depois de enviado, dá pra editar número do teste/fotos direto por aqui.
          href: testeStatus !== "aguardando_execucao" ? `/painel/testes/${testeId}#dados-campo` : `/painel/testes/${testeId}`,
        },
        {
          label: "PDF do opacímetro importado",
          feito: testeStatus === "aguardando_revisao" || testeStatus === "aprovado",
          href: `/painel/testes/${testeId}`,
        },
        {
          label: "Laudo revisado e liberado",
          feito: testeStatus === "aprovado",
          href: `/painel/testes/${testeId}`,
        },
      ]
    : undefined;
  const clientePronto = cliente?.status === "completo";
  const botaoClasse = "rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark";
  const botaoClasseSecundario = "rounded-md border border-brand px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10";
  // Editar cliente/veículo a partir daqui precisa voltar pra cá, não pro
  // destino padrão dessas telas (cadastro do cliente/veículo) — senão o
  // "← Voltar" de lá manda pro lugar errado.
  const voltarParaAgendamento = `?voltar=${encodeURIComponent(`/painel/agenda/${agendamento.id}`)}`;
  const hrefEditarCliente = agendamento.cliente_id
    ? `/painel/clientes/${agendamento.cliente_id}/editar${voltarParaAgendamento}`
    : undefined;

  const passos: Passo[] = [
    {
      label: "Cadastro do cliente completo",
      feito: clientePronto,
      href: hrefEditarCliente,
      icon: User,
      acao: !clientePronto && hrefEditarCliente && (
        <Link href={hrefEditarCliente} className={botaoClasse}>
          Completar cadastro
        </Link>
      ),
    },
    {
      label: "Veículo/equipamento vinculado",
      feito: !!agendamento.veiculo_id,
      // Concluído: vai direto pra edição (ícone/texto do passo já servem de
      // atalho, sem precisar de um botão extra). Pendente: rola até o form
      // de vincular, mais abaixo na própria página.
      href: agendamento.veiculo_id ? `/painel/clientes/${agendamento.cliente_id}` : "#vincular-veiculo",
      icon: Car,
      acao: podeGerenciar && clientePronto && !agendamento.veiculo_id && (
        <Link href="#vincular-veiculo" className={botaoClasse}>
          Vincular veículo/equipamento
        </Link>
      ),
    },
    {
      label: "Proposta aceita pelo cliente",
      feito: proposta?.status === "aceita",
      href: proposta ? "#proposta" : undefined,
      icon: Handshake,
      // Emitir e aceitar viraram um passo só — não fazia sentido separar
      // "emitida" da aceita, o que importa mesmo é ter o aceite do cliente.
      acao:
        podeGerenciar &&
        (!proposta?.pdf_path ? (
          clientePronto &&
          agendamento.veiculo_id && (
            <form action={emitirPropostaPdf.bind(null, agendamento.id)}>
              <SubmitButton pendingLabel="Emitindo..." className={botaoClasse}>
                Emitir e enviar proposta
              </SubmitButton>
            </form>
          )
        ) : proposta.status === "enviada" ? (
          <AceitarPropostaButton agendamentoId={agendamento.id} className={botaoClasseSecundario} />
        ) : null),
    },
    {
      label: "Execução do teste iniciada",
      feito: execucaoIniciada,
      href: testeId ? `/painel/testes/${testeId}` : undefined,
      icon: Play,
      acao: podeGerenciar && clientePronto && agendamento.veiculo_id && !execucaoIniciada && (
        <form action={iniciarExecucaoTeste.bind(null, agendamento.id)}>
          <SubmitButton pendingLabel="Iniciando..." className={botaoClasse}>
            Iniciar execução do teste
          </SubmitButton>
        </form>
      ),
      subpassos: subpassosExecucao,
    },
  ];

  const veiculos =
    podeGerenciar && cliente?.status === "completo" && !agendamento.veiculo_id
      ? (
          await supabase
            .from("veiculos_maquinas")
            .select("id, identificador, marca, modelo")
            .eq("cliente_id", agendamento.cliente_id)
        ).data
      : null;

  const mensagemWpp = proposta
    ? `Olá ${cliente?.nome ?? ""}! Segue o orçamento do teste de opacidade: ${formatarMoeda(proposta.valor_total)}. Pra ver os detalhes e confirmar, acesse: ${COMPANY.siteUrl}/proposta/${proposta.token}`
    : "";
  const whatsappDigits = onlyDigits(agendamento.whatsapp_contato || agendamento.telefone_contato || "");
  // wa.me exige DDI — se o número já tiver 12-13 dígitos assume que o DDI já
  // está incluso, senão prefixa 55 (Brasil).
  const whatsappNumero =
    whatsappDigits.length >= 12 ? whatsappDigits : whatsappDigits ? `55${whatsappDigits}` : "";
  const linkWpp = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensagemWpp)}`
    : `https://wa.me/?text=${encodeURIComponent(mensagemWpp)}`;

  return (
    <div className="mx-auto max-w-lg lg:max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href={voltarPara}
          className="flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-brand"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        {canExcluirTeste(perfil.role) && (
          <ConfirmDeleteButton
            onConfirm={excluirTeste.bind(null, agendamento.id)}
            label={
              <span className="flex items-center gap-1.5">
                <Trash2 className="size-4" />
                Excluir teste
              </span>
            }
            title="Excluir este teste?"
            description="O agendamento e todos os dados do ensaio (fotos, medições, PDF importado) são apagados de vez. Essa ação não pode ser desfeita."
            variant="ghost"
            size="sm"
            className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
          />
        )}
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{nomeServico}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-neutral-500">
        <Calendar className="size-4" />
        {format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
      </p>

      {testeStatus === "aprovado" && (
        <Link
          href={`/painel/testes/${testeId}`}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 p-5 shadow-sm hover:bg-brand/10"
        >
          <div>
            <p className="text-sm font-semibold text-brand">Laudo emitido</p>
            <p className="text-sm text-neutral-600">Baixar PDF, reenviar por WhatsApp/e-mail ou ver a página de verificação.</p>
            {validadeLaudo && (
              <p className="mt-1 text-xs text-neutral-500">Válido até {validadeLaudo.toLocaleDateString("pt-BR")}</p>
            )}
          </div>
          <ArrowRight className="size-5 shrink-0 text-brand" />
        </Link>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-8">
          <PassoAPasso passos={passos} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Cartao icon={User} titulo="Contato">
            <p className="text-neutral-900">
              {agendamento.nome_contato} · {agendamento.telefone_contato}
            </p>
            {cliente?.status === "pendente" && hrefEditarCliente && (
              <Link href={hrefEditarCliente} className="mt-2 inline-block text-sm text-brand hover:underline">
                Completar cadastro do cliente (CNPJ/CPF) →
              </Link>
            )}
          </Cartao>

          {agendamento.endereco && (
            <Cartao icon={MapPin} titulo="Local do teste">
              <p className="text-neutral-900">
                {agendamento.endereco}
                {agendamento.numero && `, ${agendamento.numero}`} {agendamento.cep && `· CEP ${agendamento.cep}`}
              </p>
            </Cartao>
          )}

          {veiculo && (
            <Cartao icon={Car} titulo="Veículo/equipamento" id="veiculo">
              <p className="text-neutral-900">
                {veiculo.identificador} {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}
              </p>
            </Cartao>
          )}

          {proposta && (
            <Cartao icon={Wallet} titulo="Proposta" id="proposta">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="text-3xl font-bold text-brand">{formatarMoeda(proposta.valor_total)}</p>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap uppercase ${STATUS_CLASSE[proposta.status] ?? "bg-neutral-100 text-neutral-600"}`}
                >
                  {STATUS_LABEL[proposta.status] ?? proposta.status}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2.5 border-t border-neutral-100 pt-4">
                <a
                  href={linkWpp}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  <MessageCircle className="size-4" />
                  Reenviar por WhatsApp
                </a>
                {cliente?.email && <ReenviarEmailButton agendamentoId={agendamento.id} />}
                <Link
                  href={`/proposta/${proposta.token}`}
                  target="_blank"
                  className="flex w-full items-center justify-center rounded-full border-2 border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Ver página pública
                </Link>
              </div>
            </Cartao>
          )}

          {podeGerenciar && cliente?.status === "completo" && !agendamento.veiculo_id && (
            <Cartao icon={Car} titulo="Vincular veículo/equipamento" id="vincular-veiculo">
              {veiculos && veiculos.length > 0 ? (
                <form action={vincularVeiculo} className="flex flex-col gap-2">
                  <input type="hidden" name="agendamento_id" value={agendamento.id} />
                  <select name="veiculo_id" required className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                    <option value="">Selecione...</option>
                    {veiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.identificador} {[v.marca, v.modelo].filter(Boolean).join(" ")}
                      </option>
                    ))}
                  </select>
                  <SubmitButton pendingLabel="Vinculando..." className="w-full rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                    Vincular
                  </SubmitButton>
                </form>
              ) : (
                <Link href={`/painel/clientes/${agendamento.cliente_id}`} className="text-sm text-brand hover:underline">
                  Cadastrar veículo/equipamento no cadastro do cliente →
                </Link>
              )}
            </Cartao>
          )}
        </div>
      </div>
    </div>
  );
}
