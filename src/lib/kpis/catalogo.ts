import type { LucideIcon } from "lucide-react";
import { Gauge, Users, Contact, CalendarClock, Calendar, Globe } from "lucide-react";
import type { Role } from "@/lib/auth/permissions";

export type KpiSecaoKey =
  | "testes_resumo"
  | "clientes_veiculos"
  | "equipe_pessoas"
  | "meus_agendamentos"
  | "agenda_geral"
  | "site";

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
  // Único item do catálogo com tipo "acesso" até agora — controla se a
  // pessoa consegue abrir /painel/site/** e /painel/servicos/** (via
  // requireArea, src/lib/auth/session.ts), não aparece como card no
  // dashboard (/painel/page.tsx não tem case pra ele).
  {
    key: "site",
    label: "Gerenciamento do site",
    nivelPadrao: "gerencia",
    icon: Globe,
    cor: "#0e7490",
    href: "/painel/site",
    tipo: "acesso",
  },
];

export const KPI_SECAO_POR_KEY: Record<KpiSecaoKey, KpiSecaoDef> = Object.fromEntries(
  KPI_SECOES.map((secao) => [secao.key, secao])
) as Record<KpiSecaoKey, KpiSecaoDef>;

export const KPI_SECOES_DASHBOARD = KPI_SECOES.filter((secao) => secao.tipo === "kpi");
export const KPI_SECOES_ACESSO = KPI_SECOES.filter((secao) => secao.tipo === "acesso");
