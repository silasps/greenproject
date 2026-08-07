"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { enviarContato, type ContatoState } from "./actions";

const ESTADO_INICIAL: ContatoState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(enviarContato, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" autoComplete="name" required aria-invalid={!!state.errors?.nome} />
        {state.errors?.nome && <p className="text-sm text-red-600">{state.errors.nome}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={!!state.errors?.email}
          />
          {state.errors?.email && <p className="text-sm text-red-600">{state.errors.email}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone (opcional)</Label>
          <Input id="telefone" name="telefone" type="tel" autoComplete="tel" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mensagem">Mensagem</Label>
        <Textarea
          id="mensagem"
          name="mensagem"
          required
          rows={5}
          placeholder="Conte o que você precisa: tipo de veículo/equipamento, local e prazo desejado."
          aria-invalid={!!state.errors?.mensagem}
        />
        {state.errors?.mensagem && <p className="text-sm text-red-600">{state.errors.mensagem}</p>}
      </div>

      <Button type="submit" disabled={pending} className="w-full bg-brand hover:bg-brand-dark">
        {pending ? "Enviando..." : "Enviar mensagem"}
      </Button>

      {state.status !== "idle" && (
        <p
          role="status"
          className={`text-sm ${state.status === "success" ? "text-brand-dark" : "text-red-600"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
