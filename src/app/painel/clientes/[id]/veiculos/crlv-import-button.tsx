"use client";

import { ImportarPdfButton } from "@/components/importar-pdf-button";
import type { DadosCrlv } from "@/lib/veiculos/parse-crlv";
import { lerCrlv } from "./crlv-actions";

/** Usado no cadastro de veículo e no cadastro rápido do modal da Agenda. */
export function CrlvImportButton({ onDados }: { onDados: (dados: DadosCrlv) => string[] }) {
  return (
    <ImportarPdfButton
      rotulo="Preencher com o e-CRLV (PDF)"
      doDocumento="do e-CRLV"
      dica="Baixe o CRLV digital no app Carteira Digital de Trânsito e selecione o PDF aqui."
      ler={lerCrlv}
      onDados={onDados}
    />
  );
}
