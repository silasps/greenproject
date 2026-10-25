"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorModal } from "@/components/error-modal";
import type { DadosCrlv } from "@/lib/veiculos/parse-crlv";
import { lerCrlv } from "./crlv-actions";

/**
 * Botão "Preencher com o e-CRLV" — envia o PDF pro servidor ler (`lerCrlv`)
 * e repassa os dados pro form via `onDados`, que devolve o nome de cada
 * campo que de fato preencheu (cada form aproveita um pedaço diferente).
 * Usado no cadastro de veículo e no cadastro rápido do modal da Agenda.
 */
export function CrlvImportButton({ onDados }: { onDados: (dados: DadosCrlv) => string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setMensagem(null);
    const formData = new FormData();
    formData.set("crlv", arquivo);
    startTransition(async () => {
      try {
        const resultado = await lerCrlv(formData);
        if ("erro" in resultado) {
          setErro(resultado.erro);
          return;
        }
        const preenchidos = onDados(resultado.dados);
        if (preenchidos.length === 0) {
          setErro("O PDF foi lido, mas nenhum dado útil pra esse cadastro foi reconhecido. Preencha manualmente.");
          return;
        }
        setMensagem(`Preenchido pelo e-CRLV: ${preenchidos.join(", ")}. Confira antes de salvar.`);
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
        {pending ? "Lendo e-CRLV..." : "Preencher com o e-CRLV (PDF)"}
      </Button>
      {mensagem ? (
        <p className="text-xs font-medium text-brand-dark">{mensagem}</p>
      ) : (
        <p className="text-xs text-neutral-500">
          Baixe o CRLV digital no app Carteira Digital de Trânsito e selecione o PDF aqui.
        </p>
      )}
      <ErrorModal erro={erro} onClose={() => setErro(null)} title="Não foi possível ler o e-CRLV" />
    </div>
  );
}
