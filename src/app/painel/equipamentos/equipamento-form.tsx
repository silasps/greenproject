"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { FileDropInput } from "@/components/file-drop-input";
import { salvarEquipamento } from "./actions";

function paraTitleCase(value: string) {
  return value.replace(/\p{L}+/gu, (palavra) => palavra[0].toUpperCase() + palavra.slice(1));
}

function apenasDigitos(value: string) {
  return value.replace(/\D/g, "");
}

type Equipamento = {
  id: string;
  tipo: string;
  modelo: string;
  numero_serie: string;
  fabricante: string | null;
  numero_inmetro: string | null;
  data_afericao: string | null;
  validade: string | null;
};

export function EquipamentoForm({
  equipamento,
  cancelHref,
  certificadoUrl,
  certificadoEhImagem,
  seloUrl,
}: {
  equipamento?: Equipamento;
  cancelHref: string;
  /** URL assinada do certificado já salvo (bucket privado `arquivos-internos`) — null quando não há certificado ou quando editar não se aplica (cadastro novo). */
  certificadoUrl?: string | null;
  /** Detectado pelos bytes reais do arquivo (não pela extensão do path) — decide se o preview mostra miniatura ou um cartão "Abrir". */
  certificadoEhImagem?: boolean;
  seloUrl?: string | null;
}) {
  const [modelo, setModelo] = useState(equipamento?.modelo ?? "");
  const [numeroSerie, setNumeroSerie] = useState(equipamento?.numero_serie ?? "");
  const [numeroInmetro, setNumeroInmetro] = useState(equipamento?.numero_inmetro ?? "");
  const [dataAfericao, setDataAfericao] = useState(equipamento?.data_afericao ?? "");
  const [validade, setValidade] = useState(equipamento?.validade ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDataAfericaoChange(value: string) {
    setDataAfericao(value);
    if (value) {
      const d = new Date(value);
      d.setFullYear(d.getFullYear() + 1);
      setValidade(d.toISOString().slice(0, 10));
    }
  }

  function handleSubmit(formData: FormData) {
    if (!modelo.trim() || !numeroSerie.trim()) {
      setError("Preencha modelo e número de série antes de salvar.");
      return;
    }
    setError(null);
    startTransition(() => salvarEquipamento(formData));
  }

  return (
    <form action={handleSubmit} className="mt-6 mx-auto max-w-lg space-y-4">
      {equipamento && <input type="hidden" name="id" value={equipamento.id} />}

      <div className="space-y-2">
        <Label htmlFor="tipo">Tipo</Label>
        <Select
          name="tipo"
          defaultValue={equipamento?.tipo ?? "opacimetro"}
          items={{ opacimetro: "Opacímetro", tacometro: "Tacômetro" }}
        >
          <SelectTrigger id="tipo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opacimetro">Opacímetro</SelectItem>
            <SelectItem value="tacometro">Tacômetro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            name="modelo"
            placeholder="Smoke Check 2000"
            required
            value={modelo}
            onChange={(e) => setModelo(paraTitleCase(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numero_serie">Número de série</Label>
          <Input
            id="numero_serie"
            name="numero_serie"
            required
            inputMode="numeric"
            value={numeroSerie}
            onChange={(e) => setNumeroSerie(apenasDigitos(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fabricante">Fabricante</Label>
        <Input id="fabricante" name="fabricante" defaultValue={equipamento?.fabricante ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="numero_inmetro">Número INMETRO</Label>
        <Input
          id="numero_inmetro"
          name="numero_inmetro"
          inputMode="numeric"
          value={numeroInmetro ?? ""}
          onChange={(e) => setNumeroInmetro(apenasDigitos(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_afericao">Data de aferição</Label>
          <Input
            id="data_afericao"
            name="data_afericao"
            type="date"
            value={dataAfericao ?? ""}
            onChange={(e) => handleDataAfericaoChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validade">Validade</Label>
          <Input
            id="validade"
            name="validade"
            type="date"
            value={validade ?? ""}
            onChange={(e) => setValidade(e.target.value)}
          />
          <p className="text-xs text-neutral-500">Sugerido: 1 ano após a aferição. Pode ajustar.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="certificado">
          Certificado de calibração (PDF ou foto){equipamento ? " — enviar substitui o atual" : ""}
        </Label>
        <FileDropInput
          id="certificado"
          name="certificado"
          accept="application/pdf,image/*"
          label="Clique para enviar o certificado (PDF ou imagem)"
          previaAtualUrl={certificadoUrl}
          previaAtualEhImagem={certificadoEhImagem}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selo_imagem">
          Selo/imagem do modelo (opcional){equipamento ? " — enviar substitui o atual" : ""}
        </Label>
        <FileDropInput
          id="selo_imagem"
          name="selo_imagem"
          accept="image/*"
          label="Clique para enviar o selo do fabricante (imagem)"
          previaAtualUrl={seloUrl}
        />
        <p className="text-xs text-neutral-500">
          Selo de verificação do fabricante (ex.: &ldquo;Smoke Check 2000 — Opacímetro Portátil&rdquo;), usado no PDF do
          laudo junto com o QR code de verificação.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : "Salvar equipamento"}
        </Button>
        <ConfirmLeaveButton to={cancelHref} label="Cancelar" variant="outline" />
      </div>
    </form>
  );
}
