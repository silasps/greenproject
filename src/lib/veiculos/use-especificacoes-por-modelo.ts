"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type EspecificacaoComModelo = {
  identificacaoMotor: string;
  origem: "importado_anfavea" | "manual";
  marchaLentaMin: number | null;
  marchaLentaMax: number | null;
  rotacaoCorteMin: number | null;
  rotacaoCorteMax: number | null;
  limiteOpacidade: number | null;
};

/**
 * Todo modelo de uma marca com especificação de motor já confirmada (import
 * ANFAVEA ou cadastro manual anterior) — busca com debounce ao digitar a
 * marca. Compartilhado entre o cadastro completo de veículo (`VeiculoForm`)
 * e o cadastro rápido embutido no modal de criar teste/evento
 * (`CadastroClienteVeiculo`), que precisam do mesmo preenchimento
 * automático ao reconhecer o modelo.
 */
export function useEspecificacoesPorModelo(marca: string, ativo: boolean) {
  const [especificacoesPorModelo, setEspecificacoesPorModelo] = useState<Record<string, EspecificacaoComModelo>>({});

  useEffect(() => {
    if (!ativo) return;
    const marcaLimpa = marca.trim();
    const timeout = setTimeout(() => {
      if (!marcaLimpa) {
        setEspecificacoesPorModelo({});
        return;
      }
      const supabase = createClient();
      supabase
        .from("especificacoes_motor")
        .select(
          "modelo, identificacao_motor, origem, marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade",
        )
        .eq("status", "confirmado")
        .ilike("marca", marcaLimpa)
        .not("modelo", "is", null)
        .then(({ data }) => {
          const mapa: Record<string, EspecificacaoComModelo> = {};
          for (const linha of data ?? []) {
            if (!linha.modelo) continue;
            mapa[linha.modelo] = {
              identificacaoMotor: linha.identificacao_motor,
              origem: linha.origem as "importado_anfavea" | "manual",
              marchaLentaMin: linha.marcha_lenta_min,
              marchaLentaMax: linha.marcha_lenta_max,
              rotacaoCorteMin: linha.rotacao_corte_min,
              rotacaoCorteMax: linha.rotacao_corte_max,
              limiteOpacidade: linha.limite_opacidade,
            };
          }
          setEspecificacoesPorModelo(mapa);
        });
    }, 400);
    return () => clearTimeout(timeout);
  }, [marca, ativo]);

  return especificacoesPorModelo;
}

/**
 * Especificação confirmada do modelo digitado — ignora maiúscula/espaços,
 * porque o modelo pode chegar em caixa alta (e-CRLV: "ATEGO 2426") enquanto
 * o cadastrado veio da ANFAVEA/FIPE ("Atego 2426").
 */
export function encontrarEspecificacao(
  especificacoesPorModelo: Record<string, EspecificacaoComModelo>,
  modelo: string,
): EspecificacaoComModelo | undefined {
  const normalizar = (texto: string) => texto.trim().replace(/\s+/g, " ").toLowerCase();
  const alvo = normalizar(modelo);
  if (!alvo) return undefined;
  const chave = Object.keys(especificacoesPorModelo).find((m) => normalizar(m) === alvo);
  return chave ? especificacoesPorModelo[chave] : undefined;
}
