"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_STORAGE_KEY = "gp_cookie_consent";

export type CookieConsent = "todos" | "essenciais";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "todos" || value === "essenciais" ? value : null;
}

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null>("essenciais");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Ler localStorage precisa ser client-only: fazer isso durante o render
    // quebraria a hidratação (servidor não tem acesso a ele).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(getCookieConsent());
    setHydrated(true);
  }, []);

  function choose(value: CookieConsent) {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent("gp-cookie-consent-changed", { detail: value }));
    setConsent(value);
  }

  if (!hydrated || consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-700">
          Usamos cookies essenciais para o funcionamento do site e, com sua permissão, cookies
          para melhorar sua experiência. Veja detalhes na nossa{" "}
          <Link href="/cookies" className="underline hover:text-emerald-700">
            Política de Cookies
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose("essenciais")}>
            Somente essenciais
          </Button>
          <Button size="sm" onClick={() => choose("todos")}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
