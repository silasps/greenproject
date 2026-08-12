"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { getCookieConsent, type CookieConsent } from "@/components/cookie-consent-banner";
import { ScrollReveal } from "./scroll-reveal";

// ID do widget da Greenproject no Trustindex — o mesmo usado no site antigo,
// então continua puxando as avaliações reais já publicadas (Google).
const WIDGET_SRC = "https://cdn.trustindex.io/loader.js?b464f2f67e3512008b660fce3d9";

export function ReviewsSection() {
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    function evaluate(consent: CookieConsent | null) {
      setShowWidget(consent === "todos");
    }
    evaluate(getCookieConsent());

    function onChange(event: Event) {
      evaluate((event as CustomEvent<CookieConsent>).detail);
    }
    window.addEventListener("gp-cookie-consent-changed", onChange);
    return () => window.removeEventListener("gp-cookie-consent-changed", onChange);
  }, []);

  return (
    <section className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <ScrollReveal>
          <h2 className="text-2xl font-bold text-neutral-900">O que nossos clientes dizem</h2>
        </ScrollReveal>

        {showWidget ? (
          <ScrollReveal index={1}>
            <div className="mt-8" data-src={WIDGET_SRC} />
            <Script src={WIDGET_SRC} strategy="lazyOnload" />
          </ScrollReveal>
        ) : (
          <ScrollReveal index={1}>
            <p className="mt-4 max-w-xl text-sm text-neutral-600">
              Ative os cookies não essenciais para carregar nossas avaliações reais do Google
              (via Trustindex).{" "}
              <a href="/cookies" className="text-brand underline hover:text-brand-dark">
                Gerenciar cookies
              </a>
              .
            </p>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
