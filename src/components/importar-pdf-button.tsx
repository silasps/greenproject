"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/error-modal";

/**
 * Botão "Preencher com o <documento> (PDF)" — envia o PDF pra server action
 * `ler` (e-CRLV, CNH…) e repassa os dados pro form via `onDados`, que
 * devolve o nome de cada campo que de fato preencheu (cada form aproveita
 * um pedaço diferente do documento) — é isso que a mensagem lista.
 */
export function ImportarPdfButton<T>({
  rotulo,
  doDocumento,
  dica,
  ler,
  onDados,
}: {
  /** Texto do botão, ex.: "Preencher com o e-CRLV (PDF)". */
  rotulo: string;
  /** Com artigo, pras mensagens: "do e-CRLV", "da CNH". */
  doDocumento: string;
  /** Onde a pessoa consegue o PDF. */
  dica: string;
  ler: (formData: FormData) => Promise<{ dados: T } | { erro: string }>;
  onDados: (dados: T) => string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setMensagem(null);
    const formData = new FormData();
    formData.set("pdf", arquivo);
    startTransition(async () => {
      try {
        const resultado = await ler(formData);
        if ("erro" in resultado) {
          setErro(resultado.erro);
          return;
        }
        const preenchidos = onDados(resultado.dados);
        if (preenchidos.length === 0) {
          setErro("O PDF foi lido, mas nenhum dado útil pra esse cadastro foi reconhecido. Preencha manualmente.");
          return;
        }
        setMensagem(`Preenchido com dados ${doDocumento}: ${preenchidos.join(", ")}. Confira antes de salvar.`);
      } catch {
        setErro("Não foi possível enviar o PDF. Confira sua conexão com a internet e tente de novo.");
      } finally {
        // Permite escolher o mesmo arquivo de novo (onChange não dispara se o valor não mudar).
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-brand/40 bg-brand/[0.03] p-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handleArquivo(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="w-full border-brand text-brand hover:bg-brand/10"
      >
        {pending ? <Loader2 className="animate-spin" /> : <FileText />}
        {pending ? "Lendo o PDF..." : rotulo}
      </Button>
      {mensagem ? (
        <p className="text-xs font-medium text-brand-dark">{mensagem}</p>
      ) : (
        <p className="text-xs text-neutral-500">{dica}</p>
      )}
      <ErrorModal erro={erro} onClose={() => setErro(null)} title={`Não foi possível ler o PDF ${doDocumento}`} />
    </div>
  );
}
