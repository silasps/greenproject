import { requireSuperadmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SugestaoLinha } from "./sugestao-linha";

export default async function SugestoesPage() {
  await requireSuperadmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sugestoes")
    .select("id, pagina, mensagem, user_agent, lida, criado_em, usuario:usuarios_perfis!sugestoes_usuario_id_fkey(nome)")
    .order("lida", { ascending: true })
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
    lida: boolean;
    criado_em: string;
    usuario: { nome: string } | null;
  }> | null;

  const naoLidas = sugestoes?.filter((s) => !s.lida).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Sugestões</h1>
        {naoLidas > 0 && (
          <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
            {naoLidas} nova{naoLidas > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Sugestões e relatos de bug enviados pelo botão flutuante do painel — visível só para você.
      </p>

      <div className="mt-6 space-y-3">
        {sugestoes?.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhuma sugestão enviada ainda.</p>
        )}
        {sugestoes?.map((s) => (
          <SugestaoLinha
            key={s.id}
            id={s.id}
            usuarioNome={s.usuario?.nome ?? "Usuário removido"}
            pagina={s.pagina}
            mensagem={s.mensagem}
            userAgent={s.user_agent}
            lida={s.lida}
            criadoEm={s.criado_em}
          />
        ))}
      </div>
    </div>
  );
}
