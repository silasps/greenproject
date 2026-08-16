"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importarTabelaAnfavea } from "./actions";

export function ImportarTabelaForm({ marcaInicial }: { marcaInicial: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setErro(null);
    setResultado(null);
    startTransition(async () => {
      try {
        const marca = String(formData.get("marca") || "");
        const url = String(formData.get("url") || "");
        const r = await importarTabelaAnfavea(marca, url);
        if (r.erroParse) {
          setErro(`Fonte cadastrada e monitorada, mas ${r.erroParse.charAt(0).toLowerCase()}${r.erroParse.slice(1)}`);
        } else {
          setResultado(`${r.importadas} de ${r.total} linhas importadas (o resto já pode estar confirmado ou não mudou).`);
        }
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao importar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-3 rounded-2xl border border-dashed border-neutral-300 bg-white p-4">
      <p className="text-sm font-semibold text-neutral-800">Importar tabela de uma marca</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="marca">Marca</Label>
          <Input id="marca" name="marca" defaultValue={marcaInicial} placeholder="Ex: Volkswagen" className="w-48" required />
        </div>
        <div className="flex-1 space-y-2">
          <Label htmlFor="url">URL do PDF (site da ANFAVEA)</Label>
          <Input id="url" name="url" type="url" placeholder="https://www.anfavea.com.br/..." required />
        </div>
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Importar"}
        </Button>
      </div>
      {erro && <p className="text-sm text-amber-700">{erro}</p>}
      {resultado && <p className="text-sm text-brand-dark">{resultado}</p>}
    </form>
  );
}
