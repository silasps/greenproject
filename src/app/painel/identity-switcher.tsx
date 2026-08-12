"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { assumirIdentidade, voltarAoAdmin, type UsuarioImpersonavel } from "@/lib/auth/impersonation";

const ROLE_PILL: Record<Role, string> = {
  tecnico: "bg-neutral-100 text-neutral-600",
  escritorio: "bg-amber-50 text-amber-700",
  gerencia: "bg-brand/10 text-brand-dark",
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function IdentitySwitcher({
  usuarios,
  impersonando,
}: {
  usuarios: UsuarioImpersonavel[];
  impersonando: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 border-t border-white/10 px-4 py-3">
      <p className="text-xs font-medium text-neutral-400">{impersonando ? "Atuando como" : "Ver como"}</p>
      <Select
        items={Object.fromEntries(usuarios.map((u) => [u.id, `${u.nome} — ${ROLE_LABELS[u.role]}`]))}
        onValueChange={(id) => {
          if (typeof id !== "string") return;
          startTransition(() => {
            assumirIdentidade(id);
          });
        }}
      >
        <SelectTrigger disabled={pending} className="w-full border-white/10 bg-white/5 text-white">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Escolher usuário..." />}
        </SelectTrigger>
        <SelectContent className="min-w-64">
          {usuarios.map((u) => (
            <SelectItem key={u.id} value={u.id} className="py-1.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-600">
                {iniciais(u.nome)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">{u.nome}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_PILL[u.role]}`}>
                {ROLE_LABELS[u.role]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {impersonando && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => voltarAoAdmin())}
          className="w-full rounded-full bg-brand/20 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/30 disabled:opacity-60"
        >
          Voltar para admin
        </button>
      )}
    </div>
  );
}
