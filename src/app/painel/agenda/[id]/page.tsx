import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, User, MapPin, Wallet, Car, MessageCircle, FileText, Play, CheckCircle2, Circle, ListChecks } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { canGerenciarClientes } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { COMPANY } from "@/lib/legal/company-info";
import { onlyDigits } from "@/lib/utils/mascaras";
import { SubmitButton } from "@/components/submit-button";
import { iniciarExecucaoTeste, vincularVeiculo, emitirPropostaPdf, aceitarPropostaComoStaff } from "../actions";
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

function PassoAPasso({ passos }: { passos: { label: string; feito: boolean; href?: string }[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
        <ListChecks className="size-4 text-brand" />
        Passo a passo pra concluir
      </div>
      <ol className="mt-3 space-y-2">
        {passos.map((passo, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            {passo.feito ? (
              <CheckCircle2 className="size-4 shrink-0 text-brand" />
            ) : (
              <Circle className="size-4 shrink-0 text-neutral-300" />
            )}
            {!passo.feito && passo.href ? (
              <Link href={passo.href} className="font-medium text-brand hover:underline">
                {passo.label}
              </Link>
            ) : (
              <span className={passo.feito ? "text-neutral-500 line-through" : "font-medium text-neutral-900"}>
                {passo.label}
              </span>
            )}
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
    <div id={id} className="mt-4 scroll-mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
        <Icon className="size-4 text-brand" />
        {titulo}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function AgendamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { perfil } = await requireAuth();
  const { id } = await params;
  const supabase = await createClient();

  const { data: agendamento } = await supabase
    .from("agendamentos")
    .select(
      "id, tipo, titulo, descricao, data_hora, data_hora_fim, nome_contato, telefone_contato, whatsapp_contato, cep, endereco, numero, cliente_id, veiculo_id, agendamento_participantes(usuarios_perfis(nome)), clientes(id, nome, telefone, email, status), veiculos_maquinas(identificador, marca, modelo), proposta:propostas!proposta_id(token, valor_total, status, pdf_path), testes_opacidade(id, status)",
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
      <div className="mx-auto max-w-lg">
        <Link href="/painel/agenda" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-neutral-900">{agendamento.titulo}</h1>
        <p className="mt-1 text-neutral-500">
          {format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          {agendamento.data_hora_fim &&
            ` – ${format(new Date(agendamento.data_hora_fim), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}`}
        </p>
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
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cliente = agendamento.clientes as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposta = agendamento.proposta as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const veiculo = agendamento.veiculos_maquinas as any;
  const execucaoIniciada = (agendamento.testes_opacidade?.length ?? 0) > 0;
  const execucaoConcluida = agendamento.testes_opacidade?.[0]?.status === "aprovado";
  const podeGerenciar = canGerenciarClientes(perfil.role);

  const passos = [
    {
      label: "Cadastro do cliente completo",
      feito: cliente?.status === "completo",
      href: agendamento.cliente_id ? `/painel/clientes/${agendamento.cliente_id}/editar` : undefined,
    },
    { label: "Veículo/equipamento vinculado", feito: !!agendamento.veiculo_id, href: "#vincular-veiculo" },
    { label: "Proposta em PDF emitida", feito: !!proposta?.pdf_path, href: "#acoes" },
    { label: "Execução do teste iniciada", feito: execucaoIniciada, href: "#acoes" },
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
    ? `Olá ${cliente?.nome ?? ""}! Segue o orçamento do teste de opacidade: ${formatarMoeda(proposta.valor_total)}. Detalhes: ${COMPANY.siteUrl}/proposta/${proposta.token}`
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
    <div className="mx-auto max-w-lg">
      <Link href="/painel/agenda" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand">
        <ArrowLeft className="size-4" />
        Voltar
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Teste de opacidade</h1>
      <p className="mt-1 text-neutral-500">
        {format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
      </p>

      <PassoAPasso passos={passos} />

      <Cartao icon={User} titulo="Contato">
        <p className="text-neutral-900">
          {agendamento.nome_contato} · {agendamento.telefone_contato}
        </p>
        {cliente?.status === "pendente" && (
          <Link
            href={`/painel/clientes/${agendamento.cliente_id}/editar`}
            className="mt-2 inline-block text-sm text-brand hover:underline"
          >
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
        <Cartao icon={Car} titulo="Veículo/equipamento">
          <p className="text-neutral-900">
            {veiculo.identificador} {[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}
          </p>
        </Cartao>
      )}

      {proposta && (
        <Cartao icon={Wallet} titulo="Proposta">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-neutral-900">{formatarMoeda(proposta.valor_total)}</p>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSE[proposta.status] ?? "bg-neutral-100 text-neutral-600"}`}>
              {STATUS_LABEL[proposta.status] ?? proposta.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <a
              href={linkWpp}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <MessageCircle className="size-4" />
              Reenviar por WhatsApp
            </a>
            {cliente?.email && <ReenviarEmailButton agendamentoId={agendamento.id} />}
            <Link
              href={`/proposta/${proposta.token}`}
              target="_blank"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Ver página pública
            </Link>
          </div>
          {podeGerenciar && proposta.status === "enviada" && (
            <form action={aceitarPropostaComoStaff.bind(null, agendamento.id)} className="mt-3">
              <SubmitButton
                pendingLabel="Confirmando..."
                className="text-sm font-medium text-brand hover:underline"
              >
                Aceitar proposta em nome do cliente
              </SubmitButton>
              <p className="mt-1 text-xs text-neutral-400">Use quando o cliente aceitou por telefone ou presencialmente.</p>
            </form>
          )}
        </Cartao>
      )}

      {podeGerenciar && cliente?.status === "completo" && !agendamento.veiculo_id && (
        <Cartao icon={Car} titulo="Vincular veículo/equipamento" id="vincular-veiculo">
          {veiculos && veiculos.length > 0 ? (
            <form action={vincularVeiculo} className="flex gap-2">
              <input type="hidden" name="agendamento_id" value={agendamento.id} />
              <select name="veiculo_id" required className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                <option value="">Selecione...</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.identificador} {[v.marca, v.modelo].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
              <SubmitButton pendingLabel="Vinculando..." className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                Vincular
              </SubmitButton>
            </form>
          ) : (
            <Link
              href={`/painel/clientes/${agendamento.cliente_id}/veiculos/novo`}
              className="text-sm text-brand hover:underline"
            >
              Cadastrar veículo/equipamento →
            </Link>
          )}
        </Cartao>
      )}

      {podeGerenciar && cliente?.status === "completo" && agendamento.veiculo_id && (
        <div id="acoes" className="mt-4 scroll-mt-4 flex flex-wrap gap-3">
          {!proposta?.pdf_path && (
            <form action={emitirPropostaPdf.bind(null, agendamento.id)}>
              <SubmitButton
                pendingLabel="Emitindo..."
                className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                <FileText className="size-4" />
                Emitir proposta em PDF
              </SubmitButton>
            </form>
          )}
          {execucaoIniciada && !execucaoConcluida && (
            <Link
              href={`/painel/testes/${agendamento.testes_opacidade![0].id}`}
              className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Play className="size-4" />
              Ver execução do teste
            </Link>
          )}
          {!execucaoIniciada && (
            <form action={iniciarExecucaoTeste.bind(null, agendamento.id)}>
              <SubmitButton
                pendingLabel="Iniciando..."
                className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Play className="size-4" />
                Iniciar execução do teste
              </SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
