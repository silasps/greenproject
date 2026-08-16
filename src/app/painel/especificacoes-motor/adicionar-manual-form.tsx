"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adicionarEspecificacaoManual } from "./actions";

/**
 * Pra marcas cuja tabela ANFAVEA não dá pra ler automaticamente (layout
 * transposto — coluna por veículo, ex.: Scania/Toyota/Fiat, ver
 * parse-anfavea.ts) — digita os valores uma vez lendo o PDF oficial (link
 * na lista "Marcas monitoradas" acima) e fica salvo pra sempre: as
 * próximas pessoas cadastrando um veículo dessa marca/modelo já acham
 * pronto no combobox, sem precisar repetir.
 */
export function AdicionarManualForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(formData: FormData) {
    setErro(null);
    setOk(false);
    startTransition(async () => {
      try {
        await adicionarEspecificacaoManual(formData);
        setOk(true);
        (document.getElementById("form-manual-especificacao") as HTMLFormElement | null)?.reset();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <details className="mt-8 rounded-2xl border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-neutral-800">
        Cadastrar um motor manualmente (marcas sem leitura automática, ex.: Scania, Toyota, Fiat)
      </summary>
      <form id="form-manual-especificacao" action={handleSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="marca_manual">Marca</Label>
            <Input id="marca_manual" name="marca" placeholder="Ex: Toyota" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelo_manual">Modelo (texto da tabela oficial)</Label>
            <Input id="modelo_manual" name="modelo" placeholder="Ex: I/TOYOTA HILUX CDSR A4FD" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motor_manual">Identificação do motor</Label>
          <Input id="motor_manual" name="identificacao_motor" placeholder="Ex: 1GD-FTV" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Marcha lenta — mín/máx (RPM)</Label>
            <div className="flex gap-2">
              <Input name="marcha_lenta_min" placeholder="Ex: 700" />
              <Input name="marcha_lenta_max" placeholder="Ex: 800" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rotação de corte — mín/máx (RPM)</Label>
            <div className="flex gap-2">
              <Input name="rotacao_corte_min" placeholder="Ex: 4450" />
              <Input name="rotacao_corte_max" placeholder="Ex: 4750" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="opacidade_manual">Limite de opacidade K(m-1)</Label>
          <Input id="opacidade_manual" name="limite_opacidade" placeholder="Ex: 1.19" className="w-40" />
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        {ok && <p className="text-sm text-brand-dark">Salvo — já aparece no combobox de modelo pra essa marca.</p>}
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
        </Button>
      </form>
    </details>
  );
}
