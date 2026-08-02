"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmLeaveButton({
  to,
  label,
  variant = "outline",
  className,
}: {
  to: string;
  label: string;
  variant?: "outline" | "link" | "ghost";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abandonar o cadastro?</DialogTitle>
            <DialogDescription>
              Os dados preenchidos até agora não serão salvos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Continuar editando
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => router.push(to))}
            >
              {pending ? "Saindo..." : "Sim, abandonar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
