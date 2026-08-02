import Image from "next/image";
import Link from "next/link";
import { MotionConfig } from "motion/react";
import { COMPANY } from "@/lib/legal/company-info";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { PublicNav } from "@/components/public-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // reducedMotion="user" desliga as animações do `motion` para quem tem
    // "reduzir movimento" ativado no sistema operacional.
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col">
        <header className="relative border-b border-neutral-200 bg-white">
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
            <div className="flex items-center gap-3">
              <PublicNav />
              <Link
                href="/login"
                className="hidden rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark sm:inline-flex"
              >
                Entrar
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-600 sm:px-6">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="font-semibold text-neutral-900">{COMPANY.razaoSocial}</p>
                <p className="mt-1">CNPJ {COMPANY.cnpj}</p>
                <p>{COMPANY.endereco}</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Contato</p>
                <p className="mt-1">{COMPANY.telefone}</p>
                <p>{COMPANY.email}</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Legal</p>
                <ul className="mt-1 space-y-1">
                  <li>
                    <Link href="/privacidade" className="hover:text-brand">
                      Política de Privacidade
                    </Link>
                  </li>
                  <li>
                    <Link href="/termos" className="hover:text-brand">
                      Termos de Uso
                    </Link>
                  </li>
                  <li>
                    <Link href="/cookies" className="hover:text-brand">
                      Política de Cookies
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-8 text-xs text-neutral-400">
              © {new Date().getFullYear()} {COMPANY.razaoSocial}. Todos os direitos reservados.
            </p>
          </div>
        </footer>

        <CookieConsentBanner />
      </div>
    </MotionConfig>
  );
}
