// Classificação compartilhada entre a página de testes e o menu lateral
// (contagens) — mesma precedência que já existia em statusInfo() da lista:
// reprovado conta como "Reprovado" mesmo se o laudo já foi liberado depois.

export type LinhaTesteStatus = {
  testes_opacidade: { status: string; resultado: string | null }[] | null;
};

export type FiltroStatus = "aguardando_execucao" | "pendencia_escritorio" | "aguardando_revisao" | "reprovados" | "liberados";

export function bucketDoTeste(linha: LinhaTesteStatus): FiltroStatus {
  const teste = linha.testes_opacidade?.[0];
  if (teste?.resultado === "reprovado") return "reprovados";
  if (!teste) return "aguardando_execucao";
  if (teste.status === "aprovado") return "liberados";
  if (teste.status === "aguardando_pdf_syscon") return "pendencia_escritorio";
  if (teste.status === "aguardando_revisao") return "aguardando_revisao";
  return "aguardando_execucao";
}

export const FILTROS_STATUS: { key: FiltroStatus; label: string; cor: string }[] = [
  { key: "aguardando_execucao", label: "Aguardando execução", cor: "#c98500" },
  { key: "pendencia_escritorio", label: "Pendência: importar PDF", cor: "#d97706" },
  { key: "aguardando_revisao", label: "Aguardando revisão", cor: "#c98500" },
  { key: "reprovados", label: "Reprovados", cor: "#d03b3b" },
  { key: "liberados", label: "Liberados", cor: "#0ca30c" },
];
