"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTelefone } from "@/lib/utils/mascaras";
import { salvarContato } from "./actions";

export function ContatoForm({ telefoneAtual }: { telefoneAtual: string }) {
  const [telefone, setTelefone] = useState(telefoneAtual);
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSalvo(false);
    startTransition(async () => {
      try {
        await salvarContato(formData);
        setSalvo(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 max-w-sm space-y-3">
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone / WhatsApp</Label>
        <Input
          id="telefone"
          name="telefone"
          required
          inputMode="numeric"
          value={telefone}
          onChange={(e) => {
            setTelefone(formatTelefone(e.target.value));
            setSalvo(false);
          }}
        />
        <p className="text-xs text-neutral-500">
          Esse número é usado no cabeçalho, no botão de WhatsApp e no telefone pra ligar
          do site inteiro — muda em um lugar só.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {salvo && !pending && <p className="text-sm text-brand">Salvo.</p>}

      <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
