// Texto oficial da conclusão do laudo — única fonte de verdade, usada tanto
// no PDF (gerar-pdf.ts) quanto na prévia em tela (testes/[testeId]/page.tsx),
// pra nunca divergir entre o que o revisor vê antes de validar e o que sai no documento.
export function textoConclusao(resultado: string | null, veiculoLabel: string) {
  if (resultado === "aprovado") {
    return `O veículo/máquina supracitado está APROVADO à operação mediante teste de opacidade realizado com equipamento homologado pelo INMETRO. Certificamos que nada obsta do ponto de vista de segurança ambiental que possa impedi-lo de operar normalmente, considerando o atual estado do bem. Considera-se o mesmo aprovado mediante o teste de opacidade realizado em conformidade com a instrução normativa do IBAMA nº 06 de junho de 2010, e a determinação da resolução nº 418 do CONAMA de 25 de novembro de 2009. Este laudo não pressupõe qualquer garantia explícita ou implícita quanto aos componentes inspecionados, nem isenta o fabricante ou proprietário de suas responsabilidades quanto a danos pessoais, materiais ou perdas eventualmente provocadas pelo bem descrito (${veiculoLabel}).`;
  }
  return `O veículo/máquina supracitado está REPROVADO na operação mediante teste de opacidade realizado com equipamento homologado pelo INMETRO, por não atender aos limites estabelecidos pela instrução normativa do IBAMA nº 06 de junho de 2010 e pela resolução nº 418 do CONAMA de 25 de novembro de 2009. Recomenda-se a manutenção do bem descrito (${veiculoLabel}) e a realização de novo ensaio antes de sua liberação para operação.`;
}
