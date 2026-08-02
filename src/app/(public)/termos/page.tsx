import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Termos de Uso | Greenproject Engenharia",
  description: "Condições de uso do site e dos serviços da Greenproject Engenharia.",
};

export default function TermosDeUsoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-neutral-900">Termos de Uso</h1>
      <p className="mt-2 text-sm text-neutral-500">Última atualização: 30/07/2026</p>

      <div className="mt-8 space-y-8 text-neutral-700">
        <section>
          <p>
            Estes Termos de Uso regem o acesso e uso do site e do sistema da{" "}
            <strong>{COMPANY.razaoSocial}</strong>, CNPJ {COMPANY.cnpj} (&quot;Greenproject&quot;).
            Ao acessar o site ou solicitar um de nossos serviços, você concorda
            com estas condições.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">1. Sobre os serviços</h2>
          <p className="mt-3">
            A Greenproject presta serviços de engenharia mecânica e de segurança do trabalho,
            incluindo, entre outros, laudos de opacidade, inspeção de transporte escolar,
            recategorização de veículos sinistrados, treinamento PEMT, ensaio por líquido
            penetrante, avaliação de risco (NR-12) e inspeção de máquinas e equipamentos. O
            escopo, prazo e valor de cada serviço são definidos em proposta comercial específica
            enviada ao cliente antes da execução.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">2. Cadastro e responsabilidade pelas informações</h2>
          <p className="mt-3">
            Para contratar e agendar um serviço, o cliente deve fornecer informações verdadeiras,
            completas e atualizadas sobre si e sobre o veículo, máquina ou equipamento a ser
            inspecionado. O cliente é responsável pela exatidão dos dados informados; a
            Greenproject não se responsabiliza por laudos emitidos com base em informações
            incorretas fornecidas pelo próprio cliente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">3. Natureza técnica dos laudos</h2>
          <p className="mt-3">
            Os laudos e relatórios emitidos refletem o resultado dos ensaios e inspeções
            realizados na data indicada em cada documento, sob a responsabilidade técnica do
            profissional habilitado que os assina, com o respectivo registro no conselho de
            classe (ex. CREA). Os laudos não constituem garantia sobre condições futuras do
            veículo, máquina ou equipamento inspecionado, nem substituem outras obrigações
            legais ou regulatórias a cargo do proprietário.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">4. Autenticidade e verificação</h2>
          <p className="mt-3">
            Cada laudo emitido recebe um código público de verificação, consultável no site, que
            permite confirmar sua autenticidade e conteúdo original. A alteração de um laudo
            fora desse processo o torna inválido para todos os efeitos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">5. Propriedade intelectual</h2>
          <p className="mt-3">
            O conteúdo do site (textos, marca, layout) pertence à Greenproject e não pode ser
            reproduzido sem autorização. Os laudos emitidos são de propriedade do cliente que
            contratou o serviço, para os fins a que se destinam.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">6. Uso aceitável do site</h2>
          <p className="mt-3">
            É vedado usar o site para fins ilícitos, tentar acessar áreas restritas sem
            autorização, ou interferir no funcionamento do sistema, incluindo suas áreas de
            login e agendamento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">7. Alterações destes termos</h2>
          <p className="mt-3">
            Podemos atualizar estes Termos de Uso periodicamente. A data da última atualização
            está sempre indicada no topo desta página.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">8. Foro</h2>
          <p className="mt-3">
            Fica eleito o foro da comarca de Contagem, Minas Gerais, para dirimir eventuais
            controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais
            privilegiado que seja.
          </p>
        </section>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este documento é um modelo de referência elaborado a partir dos serviços descritos
          pela empresa. Recomenda-se revisão por um profissional jurídico antes da publicação
          definitiva.
        </section>
      </div>
    </div>
  );
}
