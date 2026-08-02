import { startOfYear, endOfYear } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgendamentoItem } from "./tipos";

const SELECT =
  "id, tipo, data_hora, data_hora_fim, status, titulo, descricao, endereco, criado_por, clientes(nome), veiculos_maquinas(identificador), tecnico:usuarios_perfis!tecnico_id(nome), agendamento_participantes(usuarios_perfis(id, nome)), categoria:categorias_agenda(id, nome, cor)";

/**
 * Busca os agendamentos do ano inteiro — usada tanto no primeiro load
 * (Server Component) quanto sob demanda no client quando a navegação
 * cruza pra um ano ainda não cacheado. RLS já restringe o resultado por
 * usuário, então o mesmo client (server ou browser) funciona igual.
 */
export async function buscarAgendamentosDoAno(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  ano: number,
): Promise<AgendamentoItem[]> {
  const inicio = startOfYear(new Date(ano, 0, 1));
  const fim = endOfYear(new Date(ano, 0, 1));

  const { data } = await supabase
    .from("agendamentos")
    .select(SELECT)
    .gte("data_hora", inicio.toISOString())
    .lte("data_hora", fim.toISOString())
    .order("data_hora", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((a: any) => ({
    id: a.id,
    tipo: a.tipo,
    data_hora: a.data_hora,
    data_hora_fim: a.data_hora_fim ?? null,
    status: a.status,
    titulo: a.titulo,
    descricao: a.descricao,
    endereco: a.endereco ?? null,
    criado_por: a.criado_por,
    cliente: a.clientes?.nome ?? null,
    veiculo: a.veiculos_maquinas?.identificador ?? null,
    tecnico: a.tecnico?.nome ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    participantes: ((a.agendamento_participantes ?? []) as any[]).map((p) => p.usuarios_perfis).filter(Boolean),
    categoria: a.categoria ?? null,
  }));
}
