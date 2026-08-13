import { requireSuperadmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SugestaoLinha } from "./sugestao-linha";
import type { StatusSugestao } from "./actions";
import { STATUS_INFO, COLUNAS_STATUS } from "./status-info";

export default async function SugestoesPage() {
  await requireSuperadmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sugestoes")
    .select(
      "id, pagina, mensagem, user_agent, status, observacao, criado_em, usuario:usuarios_perfis!sugestoes_usuario_id_fkey(nome)",
    )
    .order("criado_em", { ascending: false });
  // O cliente Supabase aqui não usa os tipos gerados do banco (mesmo padrão
  // solto do resto do painel, ex. TesteComRelacoes em gerar-pdf.ts) — sem
  // isso, o embed de relação muitos-pra-um infere como array em vez de
  // objeto único.
  const sugestoes = data as Array<{
    id: string;
    pagina: string;
    mensagem: string;
    user_agent: string | null;
    status: StatusSugestao;
    observacao: string | null;
    criado_em: string;
    usuario: { nome: string } | null;
  }> | null;

  const novas = sugestoes?.filter((s) => s.status === "nova").length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Sugestões</h1>
        {novas > 0 && (
          <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
            {novas} nova{novas > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Sugestões e relatos de bug enviados pelo botão flutuante do painel — visível só para você.
      </p>

      {sugestoes?.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">Nenhuma sugestão enviada ainda.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          {COLUNAS_STATUS.map((status) => {
            const itens = sugestoes?.filter((s) => s.status === status) ?? [];
            const info = STATUS_INFO[status];
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-neutral-100 px-3 py-2">
                  <span className="text-sm font-semibold text-neutral-700">{info.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-neutral-500">
                    {itens.length}
                  </span>
                </div>
                {itens.length === 0 ? (
                  <p className="px-1 text-xs text-neutral-400">Nada por aqui.</p>
                ) : (
                  itens.map((s) => (
                    <SugestaoLinha
                      key={s.id}
                      id={s.id}
                      usuarioNome={s.usuario?.nome ?? "Usuário removido"}
                      pagina={s.pagina}
                      mensagem={s.mensagem}
                      userAgent={s.user_agent}
                      status={s.status}
                      observacao={s.observacao}
                      criadoEm={s.criado_em}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
