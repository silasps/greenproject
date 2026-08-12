import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { ScrollReveal } from "./scroll-reveal";

// Seção de fechamento em alto contraste: um cartão verde-carvão (--ink,
// bem mais escuro que o verde saturado da marca) flutuando com margem
// dentro da seção, em vez de um bloco colado nas bordas da tela.
export function FinalCta({
  eyebrow = "Solicite agora",
  headline,
  description,
  whatsappMessage,
}: {
  eyebrow?: string;
  headline: string;
  description: string;
  whatsappMessage: string;
}) {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <ScrollReveal
          className="rounded-2xl bg-ink px-6 py-14 text-center text-white sm:px-12 sm:py-20"
        >
          <span className="inline-flex items-center rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 font-mono text-xs font-semibold tracking-widest text-brand uppercase">
            {eyebrow}
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold text-balance sm:text-4xl">
            {headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href={linkWhatsapp(COMPANY.whatsapp, whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Falar no WhatsApp
            </Link>
            <Link
              href="/contato"
              className="inline-flex min-h-11 items-center rounded-md border border-white/25 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Ver outros canais de contato
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
