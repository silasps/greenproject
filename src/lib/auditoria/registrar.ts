import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Log de auditoria pras ações mais sensíveis do sistema — quem fez o quê.
 * Escopo inicial: só ações críticas (excluir teste, liberar laudo, aceitar
 * proposta em nome do cliente, editar cadastro), chamadas direto de dentro
 * da própria server action, sempre com o usuário logado que a executou (ver
 * system.architecture.md §10.14). Nunca deixa a ação principal falhar por
 * causa do log — auditoria é observabilidade, não deve travar o fluxo.
 */
export async function registrarAuditoria({
  usuarioId,
  acao,
  entidade,
  entidadeId,
  detalhes,
}: {
  usuarioId: string;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  detalhes?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("auditoria_log").insert({
    usuario_id: usuarioId,
    acao,
    entidade,
    entidade_id: entidadeId ?? null,
    detalhes: detalhes ?? null,
  });
  if (error) console.error("Falha ao registrar auditoria:", error.message);
}
