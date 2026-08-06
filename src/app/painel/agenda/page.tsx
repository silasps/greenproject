import { requireAuth } from "@/lib/auth/session";
import { canGerenciarClientes } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { parseDataParam, formatarDataParam, VISOES, type VisaoAgenda } from "@/lib/periodo-agenda";
import { buscarAgendamentosDoAno } from "./query";
import { AgendaCalendario } from "./agenda-calendario";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; data?: string; retestar_cliente_id?: string; retestar_veiculo_id?: string }>;
}) {
  const { perfil } = await requireAuth();
  const params = await searchParams;

  const visao: VisaoAgenda = VISOES.some((v) => v.valor === params.view) ? (params.view as VisaoAgenda) : "mes";
  const dataRef = parseDataParam(params.data);

  const supabase = await createClient();
  const podeCriarTeste = canGerenciarClientes(perfil.role);

  // Busca o ano inteiro de uma vez (RLS já restringe por usuário) — o
  // client guarda esse ano em cache e navega entre dia/semana/mês/ano
  // localmente, sem round-trip novo a cada clique de período.
  const ano = dataRef.getFullYear();
  const agendamentos = await buscarAgendamentosDoAno(supabase, ano);

  return (
    <div>
      <AgendaCalendario
        visaoInicial={visao}
        dataRefInicial={formatarDataParam(dataRef)}
        anoInicial={ano}
        agendamentosDoAno={agendamentos}
        usuarioId={perfil.id}
        podeCriarTeste={podeCriarTeste}
        clienteIdRetestar={params.retestar_cliente_id}
        veiculoIdRetestar={params.retestar_veiculo_id}
      />
    </div>
  );
}
