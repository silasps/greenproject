"use client";

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import type { FiltroStatus, LinhaTesteStatus } from "./testes/status";

/**
 * Ponte entre o filtro da sidebar (Sidebar, fora da página) e a lista de
 * /painel/testes — irmãos, não pai/filho. Trocar o filtro só atualiza esse
 * estado (sem navegação/round-trip ao servidor); a lista, já carregada
 * inteira, refiltra na hora. A URL é só espelhada por cima
 * (history.replaceState, nunca router.push) pra manter deep link sem forçar
 * um novo fetch — mesmo padrão do view/data da Agenda (ver seção 8.1 do
 * system.architecture.md).
 *
 * `linhas` é a mesma ponte pros dados, não só pro filtro: a sidebar contava
 * os status buscando os testes de novo, separado da lista — os dois podiam
 * divergir (ex.: lista renderizada pelo servidor num momento, contagem da
 * sidebar buscada um pouco depois já com outro dado), mostrando "1
 * aguardando revisão" na sidebar sem nada aparecer ao filtrar. A lista
 * registra aqui os dados que já tem (instantâneo, veio do servidor); a
 * sidebar só busca por conta própria se ainda não tiver nada registrado
 * (ex.: usuário numa tela de teste específico, lista nem montada).
 */
type TestesFiltroContextValue = {
  filtro: FiltroStatus | null;
  setFiltro: (filtro: FiltroStatus | null) => void;
  linhas: LinhaTesteStatus[] | null;
  registrarLinhas: (linhas: LinhaTesteStatus[] | null) => void;
};

const TestesFiltroContext = createContext<TestesFiltroContextValue | null>(null);

export function TestesFiltroProvider({ children }: { children: ReactNode }) {
  const [filtro, setFiltroState] = useState<FiltroStatus | null>(null);
  const [linhas, setLinhas] = useState<LinhaTesteStatus[] | null>(null);

  const setFiltro = (novo: FiltroStatus | null) => {
    setFiltroState(novo);
    window.history.replaceState(null, "", novo ? `/painel/testes?status=${novo}` : "/painel/testes");
  };

  const registrarLinhas = useCallback((novas: LinhaTesteStatus[] | null) => {
    setLinhas(novas);
  }, []);

  const value = useMemo(() => ({ filtro, setFiltro, linhas, registrarLinhas }), [filtro, linhas, registrarLinhas]);

  return <TestesFiltroContext.Provider value={value}>{children}</TestesFiltroContext.Provider>;
}

export function useTestesFiltro() {
  const ctx = useContext(TestesFiltroContext);
  if (!ctx) throw new Error("useTestesFiltro precisa estar dentro de TestesFiltroProvider");
  return ctx;
}
