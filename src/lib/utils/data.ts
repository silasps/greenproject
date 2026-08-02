// Reformata uma data "YYYY-MM-DD" (como vem das colunas `date` do Postgres)
// para o formato brasileiro "DD/MM/AAAA", sem passar por `Date`/fuso
// horário — evita o clássico bug de a data "andar" um dia para trás/frente.
export function formatDateBr(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const [ano, mes, dia] = isoDate.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return isoDate;
  return `${dia}/${mes}/${ano}`;
}
