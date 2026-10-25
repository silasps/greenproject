"use client";

import { ImportarPdfButton } from "@/components/importar-pdf-button";
import type { DadosCnh } from "@/lib/clientes/parse-cnh";
import { lerCnh } from "./cnh-actions";

/** Cadastro de cliente pessoa física — no form de cliente e no cadastro rápido da Agenda. */
export function CnhImportButton({ onDados }: { onDados: (dados: DadosCnh) => string[] }) {
  return (
    <ImportarPdfButton
      rotulo="Preencher com a CNH (PDF)"
      doDocumento="da CNH"
      dica="Exporte a CNH digital em PDF pelo app Carteira Digital de Trânsito e selecione o arquivo aqui."
      ler={lerCnh}
      onDados={onDados}
    />
  );
}
