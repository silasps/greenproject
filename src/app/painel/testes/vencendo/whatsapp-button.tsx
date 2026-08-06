"use client";

import { MessageCircle } from "lucide-react";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { registrarContatoWhatsapp } from "./actions";

export function WhatsappButton({
  telefone,
  mensagem,
  veiculoId,
  laudoId,
}: {
  telefone: string;
  mensagem: string;
  veiculoId: string;
  laudoId: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(linkWhatsapp(telefone, mensagem), "_blank");
        registrarContatoWhatsapp(veiculoId, laudoId).catch(() => {});
      }}
      className="flex items-center gap-1 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
    >
      <MessageCircle className="size-3.5" />
      WhatsApp
    </button>
  );
}
