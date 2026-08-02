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
export const canVerAgendaCompleta = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canGerenciarClientes = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canGerenciarEquipamentos = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canGerenciarEspecificacoesMotor = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canImportarPdfSyscon = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.escritorio;

export const canRevisarELiberarLaudo = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.gerencia;

export const canGerenciarUsuarios = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.gerencia;

export const canGerenciarResponsaveisTecnicos = (role: string | null | undefined) =>
  getRoleLevel(role) >= ROLE_LEVEL.gerencia;

export function getLoginDestination(role: string | null | undefined): string {
  if (role === "tecnico") return "/painel/agenda";
  if (role === "escritorio") return "/painel/agenda";
  if (role === "gerencia") return "/painel";
  return "/login";
}
