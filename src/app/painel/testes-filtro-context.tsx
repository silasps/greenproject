"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FiltroStatus } from "./testes/status";

/**
 * Ponte entre o filtro da sidebar (Sidebar, fora da página) e a lista de
 * /painel/testes — irmãos, não pai/filho. Trocar o filtro só atualiza esse
 * estado (sem navegação/round-trip ao servidor); a lista, já carregada
 * inteira, refiltra na hora. A URL é só espelhada por cima
 * (history.replaceState, nunca router.push) pra manter deep link sem forçar
 * um novo fetch — mesmo padrão do view/data da Agenda (ver seção 8.1 do
 * system.architecture.md).
 */
type TestesFiltroContextValue = {
  filtro: FiltroStatus | null;
  setFiltro: (filtro: FiltroStatus | null) => void;
};

const TestesFiltroContext = createContext<TestesFiltroContextValue | null>(null);

export function TestesFiltroProvider({ children }: { children: ReactNode }) {
  const [filtro, setFiltroState] = useState<FiltroStatus | null>(null);

  const setFiltro = (novo: FiltroStatus | null) => {
    setFiltroState(novo);
    window.history.replaceState(null, "", novo ? `/painel/testes?status=${novo}` : "/painel/testes");
  };

  const value = useMemo(() => ({ filtro, setFiltro }), [filtro]);

  return <TestesFiltroContext.Provider value={value}>{children}</TestesFiltroContext.Provider>;
}

export function useTestesFiltro() {
  const ctx = useContext(TestesFiltroContext);
  if (!ctx) throw new Error("useTestesFiltro precisa estar dentro de TestesFiltroProvider");
  return ctx;
}
