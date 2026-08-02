export function calcularValorTotal({
  kmIdaVolta,
  valorKm,
  pedagio,
  alimentacao,
  valorServico,
  custosExtras = [],
}: {
  kmIdaVolta: number;
  valorKm: number;
  pedagio: number;
  alimentacao: number;
  valorServico: number;
  custosExtras?: { valor: number }[];
}): number {
  const totalExtras = custosExtras.reduce((soma, item) => soma + item.valor, 0);
  return kmIdaVolta * valorKm + pedagio + alimentacao + valorServico + totalExtras;
}
