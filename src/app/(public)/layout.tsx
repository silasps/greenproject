import Link from "next/link";
import { MotionConfig } from "motion/react";
import { COMPANY } from "@/lib/legal/company-info";
import { getDadosEmpresa } from "@/lib/legal/dados-empresa";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { PublicHeader } from "@/components/public-header";
import { WhatsappFloatButton } from "@/components/whatsapp-float-button";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildLocalBusinessSchema } from "@/lib/seo/schema";
import { getServicos } from "@/lib/content/servicos";

// Todo o site público lê `servicos`/`dados_empresa` do banco a cada
// request (cabeçalho, rodapé e botão de WhatsApp mostram telefone/whatsapp
// atuais em toda página). Sem isso, o Next detecta as buscas do Supabase
// como "estáticas" (não são fetch() nativo, então o auto-detect de rota
// dinâmica não pega) e cacheia o HTML inteiro no build — uma edição no
// painel não apareceria no site sem novo deploy.
export const dynamic = "force-dynamic";

const NAV_SECUNDARIA = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
] as const;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const servicos = await getServicos();
  const { telefone, whatsapp } = await getDadosEmpresa();

  return (
    // reducedMotion="user" desliga as animações do `motion` para quem tem
    // "reduzir movimento" ativado no sistema operacional.
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-background font-sans">
        <JsonLd data={buildLocalBusinessSchema(telefone)} />
        <PublicHeader telefone={telefone} whatsapp={whatsapp} />

        <main className="flex-1">{children}</main>

        <footer className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-neutral-600 sm:px-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
              <div>
                <p className="font-mono text-[11px] font-medium tracking-widest text-neutral-400 uppercase">
                  Greenproject
                </p>
                <p className="mt-2 font-heading font-semibold text-neutral-900">
                  {COMPANY.razaoSocial}
                </p>
                <p className="mt-1">CNPJ {COMPANY.cnpj}</p>
                <p>{COMPANY.endereco}</p>
              </div>

              <div>
                <p className="font-mono text-[11px] font-medium tracking-widest text-neutral-400 uppercase">
                  Navegação
                </p>
                <ul className="mt-2 space-y-1.5">
                  {NAV_SECUNDARIA.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="hover:text-brand">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/login" className="hover:text-brand">
                      Acesso administrativo
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[11px] font-medium tracking-widest text-neutral-400 uppercase">
                  Contato
                </p>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    <Link
                      href={linkWhatsapp(whatsapp, "Olá! Gostaria de falar com a Greenproject.")}
                      target="_blank"
                      rel="noopener noreferrer"
                      suppressHydrationWarning
                      className="hover:text-brand"
                    >
                      WhatsApp {telefone}
                    </Link>
                  </li>
                  <li>
                    <a href={`mailto:${COMPANY.email}`} className="hover:text-brand">
                      {COMPANY.email}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[11px] font-medium tracking-widest text-neutral-400 uppercase">
                  Legal
                </p>
                <ul className="mt-2 space-y-1.5">
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
            <p className="mt-10 border-t border-neutral-200 pt-6 text-xs text-neutral-400">
              © {new Date().getFullYear()} {COMPANY.razaoSocial}. Todos os direitos reservados.
            </p>
          </div>
        </footer>

        <CookieConsentBanner />
        <WhatsappFloatButton
          servicos={servicos.map((servico) => ({ slug: servico.slug, titulo: servico.titulo }))}
          whatsapp={whatsapp}
        />
      </div>
    </MotionConfig>
  );
}
