"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";

const MENSAGEM_PADRAO = "Olá! Gostaria de falar com a Greenproject.";

// Serviços vêm do banco (gerenciados em /painel/servicos) — como este é um
// client component, não pode buscar direto; recebe a lista mínima já
// carregada uma vez pelo (public)/layout.tsx (server component).
export function WhatsappFloatButton({
  servicos,
}: {
  servicos: { slug: string; titulo: string }[];
}) {
  const pathname = usePathname();
  const slug = pathname?.startsWith("/servicos/") ? pathname.split("/")[2] : undefined;
  const servico = slug ? servicos.find((s) => s.slug === slug) : undefined;
  const mensagem = servico
    ? `Olá! Gostaria de solicitar um orçamento para ${servico.titulo}.`
    : MENSAGEM_PADRAO;

  return (
    <Link
      href={linkWhatsapp(COMPANY.whatsapp, mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="animate-in fade-in zoom-in-75 fixed right-4 bottom-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg duration-500 hover:scale-105 hover:bg-brand-dark sm:right-6 sm:bottom-6"
    >
      <span
        aria-hidden
        className="motion-safe:animate-ping absolute inset-0 rounded-full bg-brand opacity-75 [animation-duration:3s] [animation-iteration-count:2]"
      />
      <MessageCircle className="relative h-6 w-6 transition-transform" aria-hidden />
    </Link>
  );
}
