"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { PublicNav } from "@/components/public-nav";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";

function useScrolled(thresholdPx = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > thresholdPx);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [thresholdPx]);

  return scrolled;
}

export function PublicHeader({ telefone, whatsapp }: { telefone: string; whatsapp: string }) {
  const scrolled = useScrolled();

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-white/85 backdrop-blur transition-shadow duration-300 supports-[backdrop-filter]:bg-white/75 ${
        scrolled ? "border-neutral-200 shadow-sm" : "border-neutral-200/80 shadow-none"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/brand/logo.png"
            alt="Greenproject Engenharia"
            width={210}
            height={50}
            className="h-9 w-auto sm:h-10"
          />
        </Link>
        <div className="flex items-center gap-4">
          <PublicNav />
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href={`tel:+${whatsapp}`}
              className="hidden items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-brand lg:flex"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {telefone}
            </Link>
            <Link
              href={linkWhatsapp(whatsapp, "Olá! Gostaria de solicitar um orçamento.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Orçamento
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
