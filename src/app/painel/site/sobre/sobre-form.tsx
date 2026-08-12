"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { PaginaSobre } from "@/lib/content/pagina-sobre";
import { salvarPaginaSobre } from "../actions";

export function SobreForm({ sobre }: { sobre: PaginaSobre }) {
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSalvo(false);
    startTransition(async () => {
      try {
        await salvarPaginaSobre(formData);
        setSalvo(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-6 max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="headline">Título principal</Label>
        <Textarea id="headline" name="headline" required defaultValue={sobre.headline} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="introducao">Texto de introdução</Label>
        <Textarea id="introducao" name="introducao" required defaultValue={sobre.introducao} />
      </div>

      <div className="space-y-2">
        <Label>Como trabalhamos</Label>
        <RichTextEditor name="como_trabalhamos" defaultValue={sobre.comoTrabalhamos} />
      </div>

      <div className="space-y-4">
        <Label>Diferenciais (os 3 cards com ícone)</Label>
        {sobre.diferenciais.map((diferencial, index) => (
          <div key={index} className="space-y-2 rounded-md border border-neutral-200 p-3">
            <p className="font-mono text-xs text-neutral-400">Card {index + 1}</p>
            <Input
              name={`diferencial_${index}_titulo`}
              required
              defaultValue={diferencial.titulo}
              placeholder="Título"
            />
            <Textarea
              name={`diferencial_${index}_descricao`}
              required
              defaultValue={diferencial.descricao}
              placeholder="Descrição"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {salvo && !pending && <p className="text-sm text-brand">Salvo.</p>}

      <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
