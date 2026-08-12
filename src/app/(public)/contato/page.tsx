import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone, Mail, MapPin } from "lucide-react";
import { COMPANY } from "@/lib/legal/company-info";
import { getDadosEmpresa } from "@/lib/legal/dados-empresa";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contato | Greenproject Engenharia",
  description:
    "Fale com a Greenproject Engenharia pelo WhatsApp, telefone, e-mail ou pelo formulário de contato.",
  alternates: {
    canonical: "/contato",
  },
};

export default async function ContatoPage() {
  const { telefone, whatsapp } = await getDadosEmpresa();

  return (
    <div className="bg-background">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            Contato
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-neutral-900 sm:text-4xl">
            Fale com a gente
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Responda o formulário ou fale direto pelo WhatsApp — atendemos em campo em
            toda a região de atuação.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-md border border-neutral-200 p-6">
            <ContactForm />
          </div>

          <div className="space-y-6">
            <Link
              href={linkWhatsapp(whatsapp, "Olá! Gostaria de falar com a Greenproject.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-neutral-200 p-4 hover:border-brand/40"
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-neutral-900">WhatsApp</p>
                <p className="text-sm text-neutral-600">{telefone}</p>
              </div>
            </Link>

            <Link
              href={`tel:+${whatsapp}`}
              className="flex items-center gap-3 rounded-md border border-neutral-200 p-4 hover:border-brand/40"
            >
              <Phone className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-neutral-900">Telefone</p>
                <p className="text-sm text-neutral-600">{telefone}</p>
              </div>
            </Link>

            <Link
              href={`mailto:${COMPANY.email}`}
              className="flex items-center gap-3 rounded-md border border-neutral-200 p-4 hover:border-brand/40"
            >
              <Mail className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-neutral-900">E-mail</p>
                <p className="text-sm text-neutral-600">{COMPANY.email}</p>
              </div>
            </Link>

            <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-4">
              <MapPin className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-neutral-900">Endereço</p>
                <p className="text-sm text-neutral-600">{COMPANY.endereco}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
