import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Política de Cookies | Greenproject Engenharia",
  description: "Como o site da Greenproject Engenharia usa cookies e como gerenciá-los.",
};

export default function PoliticaCookiesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-neutral-900">Política de Cookies</h1>
      <p className="mt-2 text-sm text-neutral-500">Última atualização: 30/07/2026</p>

      <div className="mt-8 space-y-8 text-neutral-700">
        <section>
          <p>
            Cookies são pequenos arquivos armazenados no seu navegador que ajudam o site da{" "}
            <strong>{COMPANY.razaoSocial}</strong> a funcionar corretamente e a entender como ele
            é usado. Esta página explica quais cookies usamos e como você pode gerenciá-los.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">1. Tipos de cookies que usamos</h2>
          <ul className="mt-3 list-disc space-y-3 pl-6">
            <li>
              <strong>Cookies essenciais</strong> — necessários para o funcionamento do site e
              do sistema, como manter sua sessão de login ativa na área administrativa e
              lembrar sua escolha nesta política de cookies. Não podem ser desativados, pois o
              site não funciona corretamente sem eles.
            </li>
            <li>
              <strong>Cookies de preferência</strong> — usados para lembrar escolhas feitas por
              você durante a navegação, tornando sua próxima visita mais conveniente.
            </li>
            <li>
              <strong>Cookies de desempenho/analíticos</strong> (quando habilitados) — nos
              ajudam a entender como o site é utilizado, para melhorar conteúdo e navegação. Só
              são ativados mediante seu consentimento no banner exibido na primeira visita.
            </li>
            <li>
              <strong>Cookies de terceiros</strong> — usamos o{" "}
              <a
                href="https://www.trustindex.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-brand"
              >
                Trustindex
              </a>{" "}
              para exibir nossas avaliações reais de clientes (Google) no site. Esse widget só é
              carregado se você aceitar todos os cookies no banner de consentimento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">2. Como gerenciar cookies</h2>
          <p className="mt-3">
            Ao acessar o site pela primeira vez, você pode escolher entre aceitar todos os
            cookies ou manter apenas os essenciais, por meio do banner exibido na parte inferior
            da tela. Você também pode, a qualquer momento, limpar os cookies já armazenados ou
            bloquear novos cookies diretamente nas configurações do seu navegador — o que pode
            afetar o funcionamento de algumas partes do site, incluindo o login na área
            administrativa.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">3. Mais informações</h2>
          <p className="mt-3">
            Para saber mais sobre como tratamos dados pessoais de forma geral, consulte nossa{" "}
            <a href="/privacidade" className="underline hover:text-brand">
              Política de Privacidade
            </a>
            . Em caso de dúvidas sobre cookies, entre em contato pelo e-mail{" "}
            <a href={`mailto:${COMPANY.email}`} className="underline hover:text-brand">
              {COMPANY.email}
            </a>
            .
          </p>
        </section>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este documento é um modelo de referência. Se o site passar a usar ferramentas de
          analytics ou marketing de terceiros, esta política deve ser atualizada para listá-las
          nominalmente, e o banner de consentimento deve permitir a escolha por categoria.
        </section>
      </div>
    </div>
  );
}
