"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { liberarLaudo } from "../actions";

type Responsavel = { id: string; label: string };

export function LiberarForm({ testeId, responsaveis }: { testeId: string; responsaveis: Responsavel[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await liberarLaudo(testeId, formData);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao liberar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 mx-auto max-w-md space-y-4">
      <div className="space-y-2">
        <Label>Responsável técnico</Label>
        <Select
          name="responsavel_tecnico_id"
          items={Object.fromEntries(responsaveis.map((r) => [r.id, r.label]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione quem está liberando" />
          </SelectTrigger>
          <SelectContent>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
        {pending ? "Gerando laudo..." : "Liberar laudo"}
      </Button>
    </form>
  );
}
