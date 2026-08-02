"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Botão de submit com spinner enquanto a server action roda — precisa ser filho direto de um &lt;form&gt;. */
export function SubmitButton({
  children,
  pendingLabel = "Enviando...",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn(className, "disabled:cursor-not-allowed disabled:opacity-60")}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
