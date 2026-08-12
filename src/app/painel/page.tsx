import { format, isToday, isSameDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSecoesVisiveis } from "@/lib/kpis/visibilidade";
import { KPI_SECAO_POR_KEY } from "@/lib/kpis/catalogo";
import { calcularIntervalo, formatarDataParam } from "@/lib/periodo-agenda";
import { KpiCard, KpiStat } from "@/components/kpi-card";
import { diasRestantes } from "@/lib/laudo/validade";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function buscarTestesResumo(supabase: Supabase) {
  // Parte da agenda, não da execução: um teste recém-agendado ainda não tem
  // linha em testes_opacidade (só é criada quando alguém inicia a execução),
  // mas já está "em aberto" — por padrão conta como aguardando execução.
  const { data } = await supabase
    .from("agendamentos")
    .select("status, testes_opacidade(status, resultado)")
    .eq("tipo", "teste_opacidade")
    .neq("status", "cancelado");

  const linhas = data ?? [];
  const statusDe = (t: (typeof linhas)[number]) => t.testes_opacidade?.[0]?.status ?? "aguardando_execucao";
  const resultadoDe = (t: (typeof linhas)[number]) => t.testes_opacidade?.[0]?.resultado;

  const aguardandoExecucao = linhas.filter((t) => statusDe(t) === "aguardando_execucao").length;
  // Pendência do escritório: campo já foi feito, falta só importar o PDF do
  // opacímetro — separado de "aguardando revisão" pra ficar claro de quem é a bola.
  const pendenciaEscritorio = linhas.filter((t) => statusDe(t) === "aguardando_pdf_syscon").length;
  const aguardandoRevisao = linhas.filter((t) => statusDe(t) === "aguardando_revisao").length;
  const liberados = linhas.filter((t) => statusDe(t) === "aprovado").length;
  const reprovados = linhas.filter((t) => resultadoDe(t) === "reprovado").length;
  return {
    emAberto: aguardandoExecucao + pendenciaEscritorio + aguardandoRevisao,
    aguardandoExecucao,
    pendenciaEscritorio,
    aguardandoRevisao,
    liberados,
    reprovados,
  };
}

async function buscarVencendo(supabase: Supabase) {
  const [{ data: dadosEmpresa }, { data: validades }] = await Promise.all([
    supabase.from("dados_empresa").select("dias_alerta_vencimento").single(),
    supabase.from("veiculos_validade").select("validade"),
  ]);
  const limiar = Math.max(...(dadosEmpresa?.dias_alerta_vencimento ?? [60]));
  const vencendo = (validades ?? []).filter((v) => diasRestantes(v.validade) <= limiar).length;
  return { vencendo };
}

async function buscarClientesVeiculos(supabase: Supabase) {
  const [{ data: clientes }, { count: veiculos }] = await Promise.all([
    supabase.from("clientes").select("status"),
    supabase.from("veiculos_maquinas").select("id", { count: "exact", head: true }),
  ]);
  const linhas = clientes ?? [];
  const pendentes = linhas.filter((c) => c.status === "pendente").length;
  return { total: linhas.length, pendentes, veiculos: veiculos ?? 0 };
}

async function buscarEquipe(supabase: Supabase) {
  const { count } = await supabase
    .from("usuarios_perfis")
    .select("id", { count: "exact", head: true })
    .eq("acesso_sistema", true);
  return { ativos: count ?? 0 };
}

async function buscarMeusAgendamentos(supabase: Supabase, tecnicoId: string) {
  const { data } = await supabase
    .from("agendamentos")
    .select("id, data_hora, titulo, clientes(nome), veiculos_maquinas(identificador)")
    .eq("tecnico_id", tecnicoId)
    .eq("tipo", "teste_opacidade")
    .in("status", ["agendado", "em_andamento"])
    .order("data_hora");
  const linhas = data ?? [];
  const hoje = linhas.filter((a) => isToday(new Date(a.data_hora))).length;
  const proximo = linhas[0] ?? null;
  return {
    total: linhas.length,
    hoje,
    proximo: proximo
      ? {
          id: proximo.id,
          data_hora: proximo.data_hora,
          titulo: proximo.titulo,
          cliente: proximo.clientes?.[0]?.nome ?? null,
          veiculo: proximo.veiculos_maquinas?.[0]?.identificador ?? null,
        }
      : null,
  };
}

async function buscarAgendaGeral(supabase: Supabase) {
  // Semana do calendário (dom–sáb), mesmo critério usado na Agenda (visão
  // "semana") — evita a tela mostrar "semana" com um recorte que não bate
  // com o que a Agenda considera semana.
  const { inicio, fim } = calcularIntervalo("semana", new Date());
  const { data } = await supabase
    .from("agendamentos")
    .select("data_hora")
    .eq("tipo", "teste_opacidade")
    .in("status", ["agendado", "em_andamento"])
    .gte("data_hora", inicio.toISOString())
    .lte("data_hora", fim.toISOString());

  const linhas = data ?? [];
  const porDia = Array.from({ length: 7 }, (_, i) => {
    const dia = addDays(inicio, i);
    const count = linhas.filter((a) => isSameDay(new Date(a.data_hora), dia)).length;
    return { data: dia, label: format(dia, "EEEEE", { locale: ptBR }), count, hoje: isToday(dia) };
  });
  return { total: linhas.length, porDia };
}

function ProximaAcaoCard({
  cor,
  total,
  hoje,
  proximo,
}: {
  cor: string;
  total: number;
  hoje: number;
  proximo: { id: string; data_hora: string; titulo: string | null; cliente: string | null; veiculo: string | null } | null;
}) {
  const Icon = KPI_SECAO_POR_KEY.meus_agendamentos.icon;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${cor}1a`, color: cor }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Meus agendamentos</span>
        </span>
        <span className="text-xs font-medium text-neutral-500">{hoje > 0 ? `${hoje} hoje` : `${total} agendados`}</span>
      </div>

      {proximo ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className="shrink-0 rounded-xl px-3 py-2 text-center text-sm font-bold tabular-nums"
              style={{ backgroundColor: `${cor}1a`, color: cor }}
            >
              {format(new Date(proximo.data_hora), "HH:mm")}
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Próxima ação</p>
              <p className="text-sm font-semibold text-neutral-900">{proximo.titulo ?? "Teste de opacidade"}</p>
              {(proximo.cliente || proximo.veiculo) && (
                <p className="text-xs text-neutral-500">{[proximo.cliente, proximo.veiculo].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          </div>
          <Link
            href={`/painel/agenda/${proximo.id}?voltar=${encodeURIComponent("/painel")}`}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Ver detalhes
          </Link>
        </div>
      ) : (
        <p className="mt-4 border-t border-neutral-100 pt-4 text-sm text-neutral-500">Nenhum agendamento futuro.</p>
      )}
    </div>
  );
}

function AgendaSemanaCard({
  cor,
  total,
  porDia,
}: {
  cor: string;
  total: number;
  porDia: { data: Date; label: string; count: number; hoje: boolean }[];
}) {
  const Icon = KPI_SECAO_POR_KEY.agenda_geral.icon;
  const max = Math.max(1, ...porDia.map((d) => d.count));
  const hrefSemana = `${KPI_SECAO_POR_KEY.agenda_geral.href}?view=semana&data=${formatarDataParam(new Date())}`;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* Cabeçalho e total levam pra semana inteira; cada barra abaixo leva pro dia específico. */}
      <Link href={hrefSemana} className="group block">
        <span className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${cor}1a`, color: cor }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-neutral-400 uppercase group-hover:text-neutral-600">
            Agenda da semana
          </span>
        </span>

        <p className="mt-4 text-3xl font-bold tabular-nums text-neutral-900">{total}</p>
        <p className="text-sm font-medium text-neutral-500">agendamentos nesta semana (dom–sáb)</p>
      </Link>

      <div className="mt-4 flex items-end justify-between gap-1 border-t border-neutral-100 pt-4">
        {porDia.map((dia, i) => (
          <Link
            key={i}
            href={`${KPI_SECAO_POR_KEY.agenda_geral.href}?view=dia&data=${formatarDataParam(dia.data)}`}
            className="flex flex-1 flex-col items-center gap-1.5 rounded-lg py-1 transition-colors hover:bg-neutral-50"
          >
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(6, (dia.count / max) * 40)}px`,
                backgroundColor: dia.hoje ? cor : `${cor}40`,
              }}
            />
            <span className={`text-[10px] font-medium uppercase ${dia.hoje ? "text-neutral-900" : "text-neutral-400"}`}>
              {dia.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function PainelPage() {
  const { perfil } = await requireAuth();
  const supabase = await createClient();

  const secoes = await getSecoesVisiveis(supabase, perfil);

  const [testes, clientesVeiculos, equipe, meusAgendamentos, agendaGeral, vencendo] = await Promise.all([
    secoes.has("testes_resumo") ? buscarTestesResumo(supabase) : Promise.resolve(null),
    secoes.has("clientes_veiculos") ? buscarClientesVeiculos(supabase) : Promise.resolve(null),
    secoes.has("equipe_pessoas") ? buscarEquipe(supabase) : Promise.resolve(null),
    secoes.has("meus_agendamentos") ? buscarMeusAgendamentos(supabase, perfil.id) : Promise.resolve(null),
    secoes.has("agenda_geral") ? buscarAgendaGeral(supabase) : Promise.resolve(null),
    secoes.has("testes_resumo") ? buscarVencendo(supabase) : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Olá, {perfil.nome.split(" ")[0]}</h1>
      <p className="mt-2 text-neutral-600">
        Resumo de hoje · {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </p>

      {secoes.size === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          Nenhuma seção liberada pra você ainda — fale com a gerência se acha que deveria ver algo aqui.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testes &&
            (() => {
              const pill =
                testes.pendenciaEscritorio > 0
                  ? { label: "Ação necessária", tom: "critico" as const }
                  : testes.aguardandoRevisao > 0
                    ? { label: "Aguardando revisão", tom: "atencao" as const }
                    : vencendo && vencendo.vencendo > 0
                      ? { label: `${vencendo.vencendo} vencendo`, tom: "atencao" as const }
                      : { label: "Em dia", tom: "bom" as const };
              return (
                <KpiCard
                  href={KPI_SECAO_POR_KEY.testes_resumo.href}
                  icon={KPI_SECAO_POR_KEY.testes_resumo.icon}
                  cor={KPI_SECAO_POR_KEY.testes_resumo.cor}
                  eyebrow={KPI_SECAO_POR_KEY.testes_resumo.label}
                  label="Testes em aberto"
                  valor={testes.emAberto}
                  pill={pill}
                >
                  {testes.aguardandoExecucao > 0 && <KpiStat label={`${testes.aguardandoExecucao} aguardando execução`} />}
                  {testes.pendenciaEscritorio > 0 && (
                    <KpiStat label={`${testes.pendenciaEscritorio} pendência de escritório`} tom="critico" />
                  )}
                  {testes.aguardandoRevisao > 0 && <KpiStat label={`${testes.aguardandoRevisao} aguardando revisão`} tom="atencao" />}
                  {testes.liberados > 0 && <KpiStat label={`${testes.liberados} liberados`} tom="bom" />}
                  {testes.reprovados > 0 && <KpiStat label={`${testes.reprovados} reprovados`} tom="critico" />}
                </KpiCard>
              );
            })()}

          {clientesVeiculos && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.clientes_veiculos.href}
              icon={KPI_SECAO_POR_KEY.clientes_veiculos.icon}
              cor={KPI_SECAO_POR_KEY.clientes_veiculos.cor}
              eyebrow={KPI_SECAO_POR_KEY.clientes_veiculos.label}
              label="Clientes cadastrados"
              valor={clientesVeiculos.total}
              pill={clientesVeiculos.pendentes > 0 ? { label: `${clientesVeiculos.pendentes} pendente`, tom: "atencao" } : undefined}
            >
              <KpiStat label={`${clientesVeiculos.veiculos} veículos/máquinas`} />
            </KpiCard>
          )}

          {equipe && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.equipe_pessoas.href}
              icon={KPI_SECAO_POR_KEY.equipe_pessoas.icon}
              cor={KPI_SECAO_POR_KEY.equipe_pessoas.cor}
              eyebrow={KPI_SECAO_POR_KEY.equipe_pessoas.label}
              label="Pessoas com acesso ativo"
              valor={equipe.ativos}
            />
          )}

          {meusAgendamentos && (
            <ProximaAcaoCard
              cor={KPI_SECAO_POR_KEY.meus_agendamentos.cor}
              total={meusAgendamentos.total}
              hoje={meusAgendamentos.hoje}
              proximo={meusAgendamentos.proximo}
            />
          )}

          {agendaGeral && (
            <AgendaSemanaCard cor={KPI_SECAO_POR_KEY.agenda_geral.cor} total={agendaGeral.total} porDia={agendaGeral.porDia} />
          )}
        </div>
      )}
    </div>
  );
}
