/** Código público tipo "ABCD-EFGH-JKLM" — sem chars ambíguos (0/O, 1/I). */
export function gerarTokenPublico(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 12; i++) {
    codigo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
    if (i % 4 === 3 && i !== 11) codigo += "-";
  }
  return codigo;
}
