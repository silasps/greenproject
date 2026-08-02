"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Ponte entre a Sidebar (em layout.tsx) e a AgendaCalendario (em
 * agenda/page.tsx) — são componentes irmãos, não pai/filho, então o mini
 * calendário e o filtro de categorias da sidebar precisam desse estado
 * compartilhado pra refletir (e alterar) a agenda em tempo real.
 */
type AgendaNavState = {
  dataRef: Date;
  diasComEvento: Set<string>;
  selecionarDia: (dia: Date) => void;
  garantirAno: (ano: number) => void;
};

type AgendaNavContextValue = {
  estado: AgendaNavState | null;
  registrar: (estado: AgendaNavState) => void;
  desregistrar: () => void;
  categoriasOcultas: Set<string>;
  alternarCategoriaOculta: (id: string) => void;
  categoriasVersao: number;
  notificarCategorias: () => void;
};

const AgendaNavContext = createContext<AgendaNavContextValue | null>(null);

export function AgendaNavProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<AgendaNavState | null>(null);
  // Só na sessão (não persiste) — evita divergência entre o HTML do server
  // (sem acesso a localStorage) e o primeiro render do client.
  const [categoriasOcultas, setCategoriasOcultas] = useState<Set<string>>(() => new Set());
  // Bumped sempre que criar/editar um evento pode ter criado uma categoria
  // nova (ex.: categoria pessoal automática) — avisa a lista da sidebar,
  // que vive num componente separado, pra recarregar.
  const [categoriasVersao, setCategoriasVersao] = useState(0);

  const value = useMemo<AgendaNavContextValue>(
    () => ({
      estado,
      registrar: setEstado,
      desregistrar: () => setEstado(null),
      categoriasOcultas,
      alternarCategoriaOculta: (id: string) => {
        setCategoriasOcultas((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      categoriasVersao,
      notificarCategorias: () => setCategoriasVersao((v) => v + 1),
    }),
    [estado, categoriasOcultas, categoriasVersao],
  );

  return <AgendaNavContext.Provider value={value}>{children}</AgendaNavContext.Provider>;
}

export function useAgendaNav() {
  const ctx = useContext(AgendaNavContext);
  if (!ctx) throw new Error("useAgendaNav precisa estar dentro de AgendaNavProvider");
  return ctx;
}
