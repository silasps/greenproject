/** Dias entre hoje e a validade (negativo se já venceu). */
export function diasRestantes(validade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataValidade = new Date(validade);
  dataValidade.setHours(0, 0, 0, 0);
  return Math.round((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
