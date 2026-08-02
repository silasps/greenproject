export type Participante = { id: string; nome: string };
export type Categoria = { id: string; nome: string; cor: string };

export type AgendamentoItem = {
  id: string;
  tipo: "teste_opacidade" | "evento";
  data_hora: string;
  data_hora_fim: string | null;
  status: string;
  titulo: string | null;
  descricao: string | null;
  endereco: string | null;
  criado_por: string | null;
  cliente: string | null;
  veiculo: string | null;
  tecnico: string | null;
  participantes: Participante[];
  categoria: Categoria | null;
};
