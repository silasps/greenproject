"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  Gauge,
  BadgeCheck,
  Settings,
  Contact,
  Menu,
  X,
  ArrowLeft,
  Loader2,
  LayoutDashboard,
  ClipboardCheck,
  Globe,
} from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import type { UsuarioImpersonavel } from "@/lib/auth/impersonation";
import { LogoutButton } from "./logout-button";
import { IdentitySwitcher } from "./identity-switcher";
import { useAgendaNav } from "./agenda-nav-context";
import { MiniCalendario } from "./agenda/mini-calendario";
import { CategoriasFiltro } from "./agenda/categorias-filtro";
import { TestesFiltroSidebar } from "./testes/testes-filtro-sidebar";

const FORMATADOR_DATA_BRASILIA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
});
const FORMATADOR_HORA_BRASILIA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function inscreverTick(callback: () => void) {
  const id = setInterval(callback, 30_000);
  return () => clearInterval(id);
}

// Snapshot arredondado pro minuto — precisa ser estável entre chamadas
// consecutivas dentro do mesmo render (useSyncExternalStore confere isso);
// Date.now() puro (em ms) mudaria a cada chamada e nunca estabilizaria.
function getSnapshotMinutoAtual() {
  return Math.floor(Date.now() / 60_000);
}

function getServerSnapshotNulo() {
  return null;
}

/** useSyncExternalStore em vez de useState+useEffect: sem setState pra "hidratar", e o
 * snapshot do servidor (null) bate com o primeiro render do cliente, sem warning de hidratação. */
function RelogioBrasilia({ className }: { className?: string }) {
  const minutoAtual = useSyncExternalStore(inscreverTick, getSnapshotMinutoAtual, getServerSnapshotNulo);

  if (minutoAtual === null) return null;

  const agora = new Date(minutoAtual * 60_000);
  return (
    <p className={className}>
      {FORMATADOR_DATA_BRASILIA.format(agora).replace(/\./g, "")} · {FORMATADOR_HORA_BRASILIA.format(agora)}
    </p>
  );
}

const ICONS = {
  dashboard: LayoutDashboard,
  agenda: Calendar,
  testes: ClipboardCheck,
  clientes: Users,
  equipamentos: Gauge,
  "responsaveis-tecnicos": BadgeCheck,
  dp: Contact,
  site: Globe,
  configuracoes: Settings,
} as const;

type NavItem = { href: string; label: string; key: keyof typeof ICONS };

export function Sidebar({
  navItems,
  perfil,
  identitySwitcher,
}: {
  navItems: NavItem[];
  perfil: { nome: string; role: Role; is_superadmin?: boolean };
  identitySwitcher?: { usuarios: UsuarioImpersonavel[]; impersonando: boolean };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [voltando, startVoltar] = useTransition();
  const { estado } = useAgendaNav();

  // Na Agenda, a sidebar recolhe os outros itens e mostra o mini
  // calendário no lugar — navegação de data fica a um toque, sem abrir a
  // página de agenda de novo pra trocar o dia. Só na lista/calendário em si
  // (path exato): em /painel/agenda/[id] (detalhe de um evento/teste) o
  // filtro de categorias não filtra nada ali, só ficava como ruído.
  const naAgenda = pathname === "/painel/agenda";

  // "Área de testes" é um estado que persiste ao navegar pra dentro de um
  // teste específico — que abre em /painel/agenda/[id] (é a mesma tela de
  // detalhe de agendamento usada pra evento e teste), não em
  // /painel/testes/[id]. Sem isso, entrar num teste a partir da lista
  // perdia o menu de filtros e caía no menu principal. Só reseta ao sair
  // pra um lugar que não é nem Testes nem detalhe de agendamento (ex.:
  // "Voltar ao menu", ou o calendário da Agenda em si).
  const [emAreaTestes, setEmAreaTestes] = useState(() => pathname.startsWith("/painel/testes"));
  // Precisa ser efeito mesmo (não dá pra derivar só do pathname atual — o
  // caso /painel/agenda/[id] depende do estado anterior, "continua o que já
  // era"), por isso o setState síncrono aqui é intencional.
  useEffect(() => {
    if (pathname.startsWith("/painel/testes")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmAreaTestes(true);
    } else if (!pathname.startsWith("/painel/agenda/")) {
      setEmAreaTestes(false);
    }
  }, [pathname]);

  // Mesma ideia em Testes, mas só pra quem tem a lista — um técnico
  // executando o teste dele em /painel/testes/[id] não devia ver um menu de
  // filtros de uma lista que ele nem acessa. Deriva de navItems (já filtrado
  // por acesso em layout.tsx) em vez de checar role direto, pra acompanhar
  // qualquer exceção de cargo/pessoa liberada em Configurações.
  const naTestes = emAreaTestes && navItems.some((item) => item.key === "testes");

  const navPrincipal = (
    <nav className="flex-1 space-y-1 px-3">
      {navItems.map((item) => {
        const Icon = ICONS[item.key];
        // "/painel" é prefixo de toda sub-rota — o Dashboard só fica ativo na página exata.
        const ativo =
          item.href === "/painel" ? pathname === "/painel" : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={ativo ? "page" : undefined}
            className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
              ativo ? "bg-brand/10 text-brand" : "text-neutral-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {ativo && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ativo ? "bg-brand text-white" : ""}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const navAgenda = (
    <div className="flex-1">
      <button
        type="button"
        disabled={voltando}
        onClick={() => {
          setOpen(false);
          // useTransition deixa o "pending" instantâneo (antes da resposta
          // do servidor chegar) — dá feedback imediato de que o clique
          // registrou, em vez de parecer travado até a página trocar.
          startVoltar(() => router.push("/painel"));
        }}
        className="mx-3 mb-2 flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-60"
      >
        {voltando ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ArrowLeft className="h-4 w-4 shrink-0" />}
        Voltar ao menu
      </button>
      {estado && (
        <MiniCalendario
          dataSelecionada={estado.dataRef}
          diasComEvento={estado.diasComEvento}
          garantirAno={estado.garantirAno}
          onSelecionarDia={(dia) => {
            estado.selecionarDia(dia);
            setOpen(false);
          }}
        />
      )}
      <CategoriasFiltro />
    </div>
  );

  const navTestes = (
    <div className="flex-1">
      <button
        type="button"
        disabled={voltando}
        onClick={() => {
          setOpen(false);
          startVoltar(() => router.push("/painel"));
        }}
        className="mx-3 mb-2 flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-white disabled:opacity-60"
      >
        {voltando ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ArrowLeft className="h-4 w-4 shrink-0" />}
        Voltar ao menu
      </button>
      <TestesFiltroSidebar />
    </div>
  );

  const conteudo = (
    <>
      <Link href="/painel" className="block px-3 py-4">
        <span className="flex w-full items-center justify-center rounded-full bg-white px-3 py-3">
          <Image src="/brand/logo.png" alt="Greenproject Engenharia" width={168} height={40} className="h-8 w-auto" />
        </span>
      </Link>
      <RelogioBrasilia className="px-6 pb-4 text-center text-xs font-medium text-neutral-400 capitalize" />

      {naAgenda ? navAgenda : naTestes ? navTestes : navPrincipal}

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-white">{perfil.nome}</p>
        <p className="flex items-center gap-1.5 text-xs text-neutral-400">
          {ROLE_LABELS[perfil.role]}
          {perfil.is_superadmin && (
            <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand uppercase">
              Superadmin
            </span>
          )}
        </p>
        <div className="mt-3">
          <LogoutButton />
        </div>
      </div>
      {identitySwitcher && (
        <IdentitySwitcher usuarios={identitySwitcher.usuarios} impersonando={identitySwitcher.impersonando} />
      )}
    </>
  );

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-neutral-800 md:flex print:hidden">
        {conteudo}
      </aside>

      {/* Mobile: topo com botão que abre a sidebar como painel deslizante */}
      <div className="flex items-center justify-between bg-neutral-800 px-4 py-3 md:hidden print:hidden">
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5">
          <Image src="/brand/logo.png" alt="Greenproject Engenharia" width={140} height={34} className="h-5 w-auto" />
        </span>
        <RelogioBrasilia className="text-xs font-medium text-neutral-400 capitalize" />
        <button
          type="button"
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto bg-neutral-800 shadow-xl">
            <button
              type="button"
              aria-label="Fechar menu"
              className="self-end p-4 text-neutral-400"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {conteudo}
          </aside>
        </div>
      )}
    </>
  );
}
