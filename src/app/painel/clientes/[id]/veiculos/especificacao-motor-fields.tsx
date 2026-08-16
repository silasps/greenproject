"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { InfoTooltip } from "@/components/info-tooltip";

export type EspecificacaoMotorValues = {
  identificacaoMotor: string;
  marchaLentaMin: string;
  marchaLentaMax: string;
  rotacaoCorteMin: string;
  rotacaoCorteMax: string;
  limiteOpacidade: string;
};

/**
 * Campos de identificação do motor + limites (marcha lenta/rotação de
 * corte/opacidade), extraídos do `VeiculoForm` pra reaproveitar também no
 * mini-form do técnico em campo (`campo-wizard.tsx`). Controlado (não
 * guarda o próprio estado dos valores) porque `VeiculoForm` precisa poder
 * preenchê-los "de fora" — o efeito que busca especificação por
 * marca/modelo já cadastrados só funciona assim.
 */
export function EspecificacaoMotorFields({
  marca,
  values,
  onChange,
  idPrefix = "",
}: {
  marca: string;
  values: EspecificacaoMotorValues;
  onChange: (patch: Partial<EspecificacaoMotorValues>) => void;
  /** Só prefixa id/htmlFor (evita colisão se algum dia renderizar duas vezes na mesma página) — os `name` continuam fixos, é o que as server actions leem do FormData. */
  idPrefix?: string;
}) {
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<{ encontrado: boolean } | null>(null);

  async function buscarMotor() {
    if (!marca || !values.identificacaoMotor) return;
    setBuscando(true);
    setResultado(null);
    const supabase = createClient();
    const { data } = await supabase
      .from("especificacoes_motor")
      .select("marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade")
      .eq("marca", marca)
      .eq("identificacao_motor", values.identificacaoMotor)
      .eq("status", "confirmado")
      .maybeSingle();
    setBuscando(false);

    if (!data) {
      setResultado({ encontrado: false });
      return;
    }
    onChange({
      marchaLentaMin: data.marcha_lenta_min?.toString() ?? "",
      marchaLentaMax: data.marcha_lenta_max?.toString() ?? "",
      rotacaoCorteMin: data.rotacao_corte_min?.toString() ?? "",
      rotacaoCorteMax: data.rotacao_corte_max?.toString() ?? "",
      limiteOpacidade: data.limite_opacidade?.toString() ?? "",
    });
    setResultado({ encontrado: true });
  }

  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}identificacao_motor`}>Identificação do motor</Label>
          <InfoTooltip>
            Código de identificação do motor, gravado na etiqueta/bloco do motor ou no
            manual do fabricante. Usado pra localizar automaticamente os limites já
            cadastrados pra esse motor (botão &ldquo;Buscar especificação&rdquo;). Nenhum
            desses campos é obrigatório — quem decide aprovado/reprovado é o opacímetro
            no campo, configurado pelo técnico na hora do teste.
          </InfoTooltip>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={buscando} onClick={buscarMotor}>
          {buscando ? <Loader2 className="size-4 animate-spin" /> : "Buscar especificação"}
        </Button>
      </div>
      <Input
        id={`${idPrefix}identificacao_motor`}
        name="identificacao_motor"
        className="mt-2"
        placeholder="Ex: OM904LA"
        value={values.identificacaoMotor}
        onChange={(e) => onChange({ identificacaoMotor: e.target.value })}
      />

      <Dialog open={resultado !== null} onOpenChange={(open) => !open && setResultado(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resultado?.encontrado ? "Motor encontrado" : "Motor não encontrado"}</DialogTitle>
          </DialogHeader>
          {resultado?.encontrado ? (
            <p className="text-sm text-neutral-600">
              Preenchido a partir de um cadastro existente pra <strong>{marca} {values.identificacaoMotor}</strong> —
              confira os valores abaixo antes de salvar.
            </p>
          ) : (
            <div className="space-y-2 text-sm text-neutral-600">
              <p>
                Nenhum cadastro confirmado pra <strong>{marca} {values.identificacaoMotor}</strong>. Preencha os
                limites manualmente abaixo.
              </p>
              <p>
                <Link
                  href={`/painel/especificacoes-motor?marca=${encodeURIComponent(marca)}`}
                  className="text-brand hover:underline"
                >
                  Importar tabela da marca pela ANFAVEA →
                </Link>
              </p>
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => setResultado(null)}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label>Marcha lenta — mín/máx (RPM)</Label>
            <InfoTooltip>
              Rotação do motor em marcha lenta (parado, sem acelerar), em RPM
              (rotações por minuto), conforme especificação do fabricante.
            </InfoTooltip>
          </div>
          <div className="flex gap-2">
            <Input
              name="marcha_lenta_min"
              placeholder="Ex: 700"
              value={values.marchaLentaMin}
              onChange={(e) => onChange({ marchaLentaMin: e.target.value })}
            />
            <Input
              name="marcha_lenta_max"
              placeholder="Ex: 900"
              value={values.marchaLentaMax}
              onChange={(e) => onChange({ marchaLentaMax: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label>Rotação de corte — mín/máx (RPM)</Label>
            <InfoTooltip>
              Rotação máxima do motor em que ocorre o corte automático de combustível
              (rotação de corte/governador), em RPM.
            </InfoTooltip>
          </div>
          <div className="flex gap-2">
            <Input
              name="rotacao_corte_min"
              placeholder="Ex: 2200"
              value={values.rotacaoCorteMin}
              onChange={(e) => onChange({ rotacaoCorteMin: e.target.value })}
            />
            <Input
              name="rotacao_corte_max"
              placeholder="Ex: 2600"
              value={values.rotacaoCorteMax}
              onChange={(e) => onChange({ rotacaoCorteMax: e.target.value })}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={`${idPrefix}limite_opacidade`}>Limite de opacidade K(m-1)</Label>
          <InfoTooltip>
            Coeficiente de absorção de luz da fumaça, em m⁻¹ (por metro) — o valor
            máximo permitido pelo fabricante pra esse motor no teste de opacidade.
          </InfoTooltip>
        </div>
        <Input
          id={`${idPrefix}limite_opacidade`}
          name="limite_opacidade"
          placeholder="Ex: 2.5"
          value={values.limiteOpacidade}
          onChange={(e) => onChange({ limiteOpacidade: e.target.value })}
        />
      </div>
    </div>
  );
}
