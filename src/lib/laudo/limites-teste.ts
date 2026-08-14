type LimitesTeste = {
  limite_marcha_lenta_min: number | null;
  limite_marcha_lenta_max: number | null;
  limite_rotacao_corte_min: number | null;
  limite_rotacao_corte_max: number | null;
  limite_opacidade: number | null;
};

type EspecificacaoMotor = {
  marcha_lenta_min: number | null;
  marcha_lenta_max: number | null;
  rotacao_corte_min: number | null;
  rotacao_corte_max: number | null;
  limite_opacidade: number | null;
};

/**
 * Os limites de marcha lenta/rotação de corte/opacidade de um teste podem
 * vir de duas fontes: extraídos do PDF do Syscon na importação (por
 * ensaio, mais confiável — `testes_opacidade.limite_*`), ou cadastrados
 * manualmente no veículo (`especificacoes_motor`, via
 * `especificacao_motor_id`). O teste sempre tem prioridade sobre o
 * cadastro do veículo; o veículo é o fallback.
 */
export function resolverLimitesTeste(teste: LimitesTeste, especificacao?: EspecificacaoMotor | null) {
  return {
    marchaLentaMin: teste.limite_marcha_lenta_min ?? especificacao?.marcha_lenta_min ?? null,
    marchaLentaMax: teste.limite_marcha_lenta_max ?? especificacao?.marcha_lenta_max ?? null,
    rotacaoCorteMin: teste.limite_rotacao_corte_min ?? especificacao?.rotacao_corte_min ?? null,
    rotacaoCorteMax: teste.limite_rotacao_corte_max ?? especificacao?.rotacao_corte_max ?? null,
    limiteOpacidade: teste.limite_opacidade ?? especificacao?.limite_opacidade ?? null,
  };
}

export function limitesTesteFaltando(r: ReturnType<typeof resolverLimitesTeste>) {
  return (
    r.marchaLentaMin == null ||
    r.marchaLentaMax == null ||
    r.rotacaoCorteMin == null ||
    r.rotacaoCorteMax == null ||
    r.limiteOpacidade == null
  );
}
