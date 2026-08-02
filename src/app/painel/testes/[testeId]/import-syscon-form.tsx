"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileDropInput } from "@/components/file-drop-input";
import { importarPdfSyscon } from "../actions";

export function ImportSysconForm({ testeId }: { testeId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await importarPdfSyscon(testeId, formData);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao importar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 mx-auto max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pdf_ensaio">PDF exportado pelo Syscon (ensaio armazenado no opacímetro)</Label>
        <FileDropInput id="pdf_ensaio" name="pdf_ensaio" accept="application/pdf" required />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Importando..." : "Importar e continuar"}
        </Button>
        <Link
          href="/painel/testes"
          title="Não dá pra fazer agora — deixar pendente pro escritório"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
        >
          <Building2 className="size-3.5" />
          Deixar pendente pro escritório
        </Link>
      </div>
    </form>
  );
}
