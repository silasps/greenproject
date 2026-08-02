import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSecoesVisiveis } from "@/lib/kpis/visibilidade";
import { KPI_SECAO_POR_KEY } from "@/lib/kpis/catalogo";
import { KpiCard, KpiPill, KpiInfoPill } from "@/components/kpi-card";

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
    .select("id, data_hora")
    .eq("tecnico_id", tecnicoId)
    .eq("tipo", "teste_opacidade")
    .in("status", ["agendado", "em_andamento"])
    .order("data_hora");
  const linhas = data ?? [];
  const hoje = linhas.filter((a) => isToday(new Date(a.data_hora))).length;
  return { total: linhas.length, hoje, proximo: linhas[0]?.data_hora ?? null };
}

async function buscarAgendaGeral(supabase: Supabase) {
  const agora = new Date();
  const emSeteDias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { count } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "teste_opacidade")
    .in("status", ["agendado", "em_andamento"])
    .gte("data_hora", agora.toISOString())
    .lte("data_hora", emSeteDias.toISOString());
  return { proximos7Dias: count ?? 0 };
}

export default async function PainelPage() {
  const { perfil } = await requireAuth();
  const supabase = await createClient();

  const secoes = await getSecoesVisiveis(supabase, perfil);

  const [testes, clientesVeiculos, equipe, meusAgendamentos, agendaGeral] = await Promise.all([
    secoes.has("testes_resumo") ? buscarTestesResumo(supabase) : Promise.resolve(null),
    secoes.has("clientes_veiculos") ? buscarClientesVeiculos(supabase) : Promise.resolve(null),
    secoes.has("equipe_pessoas") ? buscarEquipe(supabase) : Promise.resolve(null),
    secoes.has("meus_agendamentos") ? buscarMeusAgendamentos(supabase, perfil.id) : Promise.resolve(null),
    secoes.has("agenda_geral") ? buscarAgendaGeral(supabase) : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Olá, {perfil.nome.split(" ")[0]}</h1>
      <p className="mt-2 text-neutral-600">Resumo de hoje na Greenproject.</p>

      {secoes.size === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          Nenhuma seção liberada pra você ainda — fale com a gerência se acha que deveria ver algo aqui.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testes && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.testes_resumo.href}
              icon={KPI_SECAO_POR_KEY.testes_resumo.icon}
              cor={KPI_SECAO_POR_KEY.testes_resumo.cor}
              label="Testes em aberto"
              valor={testes.emAberto}
            >
              <KpiPill label={`${testes.liberados} liberados`} tom="bom" />
              {testes.pendenciaEscritorio > 0 && (
                <KpiPill label={`${testes.pendenciaEscritorio} pendência de escritório`} tom="critico" />
              )}
              {testes.aguardandoRevisao > 0 && <KpiPill label={`${testes.aguardandoRevisao} aguardando revisão`} tom="atencao" />}
              {testes.reprovados > 0 && <KpiPill label={`${testes.reprovados} reprovados`} tom="critico" />}
            </KpiCard>
          )}

          {clientesVeiculos && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.clientes_veiculos.href}
              icon={KPI_SECAO_POR_KEY.clientes_veiculos.icon}
              cor={KPI_SECAO_POR_KEY.clientes_veiculos.cor}
              label="Clientes cadastrados"
              valor={clientesVeiculos.total}
            >
              <KpiInfoPill label={`${clientesVeiculos.veiculos} veículos/máquinas`} />
              {clientesVeiculos.pendentes > 0 && <KpiPill label={`${clientesVeiculos.pendentes} cadastro pendente`} tom="atencao" />}
            </KpiCard>
          )}

          {equipe && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.equipe_pessoas.href}
              icon={KPI_SECAO_POR_KEY.equipe_pessoas.icon}
              cor={KPI_SECAO_POR_KEY.equipe_pessoas.cor}
              label="Pessoas com acesso ativo"
              valor={equipe.ativos}
            />
          )}

          {meusAgendamentos && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.meus_agendamentos.href}
              icon={KPI_SECAO_POR_KEY.meus_agendamentos.icon}
              cor={KPI_SECAO_POR_KEY.meus_agendamentos.cor}
              label="Meus agendamentos"
              valor={meusAgendamentos.total}
            >
              {meusAgendamentos.hoje > 0 && <KpiPill label={`${meusAgendamentos.hoje} hoje`} tom="atencao" />}
              {meusAgendamentos.proximo && (
                <KpiInfoPill
                  label={`Próximo: ${format(new Date(meusAgendamentos.proximo), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
                />
              )}
            </KpiCard>
          )}

          {agendaGeral && (
            <KpiCard
              href={KPI_SECAO_POR_KEY.agenda_geral.href}
              icon={KPI_SECAO_POR_KEY.agenda_geral.icon}
              cor={KPI_SECAO_POR_KEY.agenda_geral.cor}
              label="Testes agendados (7 dias)"
              valor={agendaGeral.proximos7Dias}
            />
          )}
        </div>
      )}
    </div>
  );
}
