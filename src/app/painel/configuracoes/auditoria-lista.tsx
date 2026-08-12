const ACAO_LABELS: Record<string, string> = {
  editar_cliente: "Editou cliente",
  editar_campo_teste: "Editou campo do teste",
  devolver_revisao: "Devolveu pra revisão",
  liberar_laudo: "Liberou laudo",
  enviar_laudo_email: "Enviou laudo por e-mail",
  excluir_teste: "Excluiu teste",
  aceitar_proposta_como_staff: "Aceitou proposta em nome do cliente",
  ativar_pessoa: "Ativou acesso de pessoa",
  inativar_pessoa: "Inativou acesso de pessoa",
};

const ENTIDADE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  teste_opacidade: "Teste de opacidade",
  pessoa: "Pessoa",
};

function label(mapa: Record<string, string>, chave: string) {
  return mapa[chave] ?? chave.replaceAll("_", " ");
}

export type LogLinha = {
  id: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  detalhes: Record<string, unknown> | null;
  created_at: string;
  usuarios_perfis: { nome: string } | null;
};

export function AuditoriaLista({ logs }: { logs: LogLinha[] }) {
  if (logs.length === 0) {
    return <p className="mt-6 text-sm text-neutral-500">Nenhum evento registrado ainda.</p>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="divide-y divide-neutral-100">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">
                {log.usuarios_perfis?.nome ?? "Usuário removido"}{" "}
                <span className="font-normal text-neutral-500">— {label(ACAO_LABELS, log.acao)}</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {label(ENTIDADE_LABELS, log.entidade)}
                {log.detalhes?.nome ? ` · ${log.detalhes.nome}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs text-neutral-400">
              {new Date(log.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
