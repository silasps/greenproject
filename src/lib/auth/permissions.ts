export type Role = "tecnico" | "escritorio" | "gerencia";

export const ROLE_LEVEL: Record<Role, number> = {
  tecnico: 10,
  escritorio: 50,
  gerencia: 80,
};

export const ROLE_LABELS: Record<Role, string> = {
  tecnico: "Técnico",
  escritorio: "Auxiliar de Escritório",
  gerencia: "Gerência",
};

export function getRoleLevel(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_LEVEL[role as Role] ?? 0;
}

export function userHasAnyRole(role: string | null | undefined, candidates: readonly Role[]) {
  return candidates.some((candidate) => role === candidate);
}

// Named permission checks — import these everywhere instead of comparing
// role strings inline, so every place that gates a feature stays in sync
// when the role hierarchy changes.
//
// canVerAgendaCompleta/canGerenciarEquipamentos/canGerenciarResponsaveisTecnicos
// foram removidas daqui — as áreas que elas gateavam (Testes, Equipamentos,
// Responsáveis Técnicos) viraram configuráveis por cargo/pessoa via
// requireArea (src/lib/auth/session.ts) + KPI_SECOES_ACESSO
// (src/lib/kpis/catalogo.ts), com o mesmo nível padrão de antes.
//
// canGerenciarClientes continua aqui porque é reaproveitada dentro do fluxo
// de Agenda/Testes (agenda/actions.ts, agenda/page.tsx, testes/actions.ts)
// pra decidir quem pode agendar/gerenciar teste pra qualquer cliente — um
// uso diferente de "pode abrir /painel/clientes" (esse virou requireArea
// também, ver clientes/actions.ts e clientes/page.tsx).
export const canGerenciarClientes = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canGerenciarEspecificacoesMotor = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canImportarPdfSyscon = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canGerenciarUsuarios = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.gerencia;

export const canExcluirTeste = (role: string | null | undefined) => getRoleLevel(role) >= ROLE_LEVEL.gerencia;

export function getLoginDestination(role: string | null | undefined): string {
  if (role === "tecnico") return "/painel/agenda";
  if (role === "escritorio") return "/painel/agenda";
  if (role === "gerencia") return "/painel";
  return "/login";
}
