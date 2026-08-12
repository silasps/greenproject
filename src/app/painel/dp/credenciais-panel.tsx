"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { onlyDigits } from "@/lib/utils/mascaras";
import type { Credenciais } from "./actions";

export function CredenciaisPanel({
  credenciais,
  onConcluir,
}: {
  credenciais: Credenciais;
  onConcluir?: () => void;
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);

  const mensagem = `Olá ${credenciais.nome}! Seu acesso ao sistema Greenproject foi criado.\nE-mail: ${credenciais.email}\nSenha: ${credenciais.senha}\n\nRecomendamos trocar a senha após o primeiro acesso.`;

  const whatsappDigits = onlyDigits(credenciais.whatsapp ?? "");
  const whatsappNumero = whatsappDigits.length >= 12 ? whatsappDigits : whatsappDigits ? `55${whatsappDigits}` : "";
  const linkWpp = whatsappNumero
    ? `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensagem)}`
    : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
  const linkEmail = `mailto:${credenciais.email}?subject=${encodeURIComponent(
    "Seu acesso ao sistema Greenproject",
  )}&body=${encodeURIComponent(mensagem)}`;

  function copiar() {
    navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="mt-6 mx-auto max-w-lg space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-neutral-900">Acesso criado para {credenciais.nome}</p>

      <div className="space-y-1 rounded-lg bg-neutral-50 p-3 text-sm">
        <p>
          <span className="text-neutral-500">E-mail:</span> {credenciais.email}
        </p>
        <p>
          <span className="text-neutral-500">Senha:</span> <span className="font-mono">{credenciais.senha}</span>
        </p>
      </div>

      <p className="text-xs text-neutral-500">
        Essa senha só aparece aqui uma vez — envie pra pessoa agora. Ela pode trocar depois de entrar.
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          href={linkWpp}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Enviar por WhatsApp
        </a>
        <a
          href={linkEmail}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Enviar por e-mail
        </a>
        <Button type="button" variant="outline" onClick={copiar}>
          {copiado ? "Copiado!" : "Copiar"}
        </Button>
      </div>

      <Button
        type="button"
        className="bg-brand hover:bg-brand-dark"
        onClick={() => (onConcluir ? onConcluir() : router.push("/painel/dp"))}
      >
        Concluir
      </Button>
    </div>
  );
}
