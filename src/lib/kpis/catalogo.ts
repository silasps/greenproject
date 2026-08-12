import type { LucideIcon } from "lucide-react";
import { Gauge, Users, Contact, CalendarClock, Calendar, Globe, ClipboardCheck, BadgeCheck } from "lucide-react";
import type { Role } from "@/lib/auth/permissions";

export type KpiSecaoKey =
  | "testes_resumo"
  | "clientes_veiculos"
  | "equipe_pessoas"
  | "meus_agendamentos"
  | "agenda_geral"
  | "site"
  | "testes"
  | "clientes"
  | "equipamentos"
  | "responsaveis_tecnicos";

export type KpiSecaoDef = {
  key: KpiSecaoKey;
  label: string;
  /** Nível mínimo de role que enxerga a seção por padrão, antes de qualquer
   * ajuste de cargo/pessoa em Configurações. */
  nivelPadrao: Role;
  icon: LucideIcon;
  /** Cor de destaque intencional da seção — nunca reaproveita as cores de
   * status (verde/âmbar/vermelho usadas nos badges de resultado). */
  cor: string;
  /** Pra onde o card leva ao ser clicado. */
  href: string;
  /** "kpi" = card de métrica na tela inicial do painel; "acesso" = controla
   * se a pessoa consegue abrir uma área inteira do sistema (via
   * requireArea, não aparece como card no dashboard). Só separa os dois
   * grupos visualmente nos formulários de exceção — a resolução
   * (pessoa > cargo > padrão) é idêntica pros dois tipos. */
  tipo: "kpi" | "acesso";
};

export const KPI_SECOES: KpiSecaoDef[] = [
  {
    key: "testes_resumo",
    label: "Testes de opacidade",
    nivelPadrao: "escritorio",
    icon: Gauge,
    cor: "#109b15", // verde da marca — o serviço principal da empresa
    href: "/painel/testes",
    tipo: "kpi",
  },
  {
    key: "clientes_veiculos",
    label: "Clientes e veículos",
    nivelPadrao: "escritorio",
    icon: Users,
    cor: "#2a78d6",
    href: "/painel/clientes",
    tipo: "kpi",
  },
  {
    key: "equipe_pessoas",
    label: "Equipe",
    nivelPadrao: "gerencia",
    icon: Contact,
    cor: "#4a3aa7",
    href: "/painel/dp",
    tipo: "kpi",
  },
  {
    key: "meus_agendamentos",
    label: "Meus agendamentos",
    nivelPadrao: "tecnico",
    icon: CalendarClock,
    cor: "#eb6834",
    href: "/painel/agenda",
    tipo: "kpi",
  },
  {
    key: "agenda_geral",
    label: "Agenda",
    nivelPadrao: "escritorio",
    icon: Calendar,
    cor: "#e87ba4",
    href: "/painel/agenda",
    tipo: "kpi",
  },
  // Seções com tipo "acesso" — controlam se a pessoa consegue abrir uma
  // área inteira do painel (via requireArea, src/lib/auth/session.ts), não
  // aparecem como card no dashboard (/painel/page.tsx não tem case pra
  // elas). `nivelPadrao` reproduz exatamente o `requireRole` que cada área
  // já tinha hardcoded antes — zero mudança de comportamento até a
  // gerência mexer num toggle. Mesmo ícone da sidebar (`sidebar.tsx`).
  {
    key: "site",
    label: "Gerenciamento do site",
    nivelPadrao: "gerencia",
    icon: Globe,
    cor: "#0e7490",
    href: "/painel/site",
    tipo: "acesso",
  },
  {
    key: "testes",
    label: "Testes (lista completa)",
    nivelPadrao: "escritorio",
    icon: ClipboardCheck,
    cor: "#109b15",
    href: "/painel/testes",
    tipo: "acesso",
  },
  {
    key: "clientes",
    label: "Clientes e veículos",
    nivelPadrao: "escritorio",
    icon: Users,
    cor: "#2a78d6",
    href: "/painel/clientes",
    tipo: "acesso",
  },
  {
    key: "equipamentos",
    label: "Equipamentos",
    nivelPadrao: "escritorio",
    icon: Gauge,
    cor: "#7a5cf0",
    href: "/painel/equipamentos",
    tipo: "acesso",
  },
  {
    key: "responsaveis_tecnicos",
    label: "Responsáveis técnicos",
    nivelPadrao: "gerencia",
    icon: BadgeCheck,
    cor: "#c2410c",
    href: "/painel/responsaveis-tecnicos",
    tipo: "acesso",
  },
  // Departamento Pessoal e Configurações propositalmente NÃO entram aqui:
  // DP cria conta, reseta senha e muda role/cargo de qualquer pessoa;
  // Configurações é onde esses próprios toggles de acesso são concedidos.
  // Delegar essas duas áreas por toggle abriria escalada de privilégio (uma
  // pessoa sem gerência ganhando DP/Configurações poderia se conceder mais
  // acesso). As duas continuam com `requireRole(["gerencia"])` fixo.
];

export const KPI_SECAO_POR_KEY: Record<KpiSecaoKey, KpiSecaoDef> = Object.fromEntries(
  KPI_SECOES.map((secao) => [secao.key, secao])
) as Record<KpiSecaoKey, KpiSecaoDef>;

export const KPI_SECOES_DASHBOARD = KPI_SECOES.filter((secao) => secao.tipo === "kpi");
export const KPI_SECOES_ACESSO = KPI_SECOES.filter((secao) => secao.tipo === "acesso");
