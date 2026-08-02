import type { Metadata } from "next";
import { COMPANY } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Política de Privacidade | Greenproject Engenharia",
  description:
    "Como a Greenproject Engenharia coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.",
};

export default function PoliticaPrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-neutral-900">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-neutral-500">Última atualização: 30/07/2026</p>

      <div className="mt-8 space-y-8 text-neutral-700">
        <section>
          <p>
            Esta Política de Privacidade descreve como a{" "}
            <strong>{COMPANY.razaoSocial}</strong>, CNPJ {COMPANY.cnpj}, com sede em{" "}
            {COMPANY.endereco} (&quot;Greenproject&quot;, &quot;nós&quot;), coleta, usa,
            armazena e protege os dados pessoais de visitantes do site, clientes e demais
            titulares, em conformidade com a Lei Geral de Proteção de Dados Pessoais
            (Lei nº 13.709/2018 — LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">1. Quais dados coletamos</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>Dados de contato e orçamento</strong>: nome, telefone, e-mail e mensagem
              enviados pelos formulários do site (ex. &quot;Solicitar orçamento&quot;).
            </li>
            <li>
              <strong>Dados cadastrais de clientes</strong>: CNPJ ou CPF, razão social/nome,
              endereço, telefone, e dados do veículo, máquina ou equipamento vinculado ao
              serviço contratado (placa ou número de série, marca, modelo, documentos e fotos).
            </li>
            <li>
              <strong>Dados de execução do serviço</strong>: fotos do veículo/equipamento e do
              ensaio, resultados de medição, e demais informações técnicas necessárias para a
              emissão do laudo contratado.
            </li>
            <li>
              <strong>Dados de navegação</strong>: informações coletadas por cookies, conforme
              detalhado na nossa{" "}
              <a href="/cookies" className="underline hover:text-brand">
                Política de Cookies
              </a>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">
            2. Para que usamos seus dados
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>Elaborar orçamentos e propostas comerciais.</li>
            <li>
              Executar os serviços de engenharia contratados (ex. laudo de opacidade),
              incluindo agendamento, execução do ensaio em campo e emissão do relatório final.
            </li>
            <li>
              Cumprir obrigações legais e regulatórias aplicáveis aos laudos técnicos emitidos
              (ex. normas ambientais e de trânsito referenciadas em cada laudo).
            </li>
            <li>Responder a contatos e dúvidas enviados pelo site.</li>
            <li>Melhorar o funcionamento e a segurança do site e do sistema interno.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">3. Base legal</h2>
          <p className="mt-3">
            Tratamos seus dados com base, conforme o caso, em: (i) execução de contrato ou de
            procedimentos preliminares a um contrato, quando você solicita um orçamento ou
            contrata um serviço; (ii) cumprimento de obrigação legal ou regulatória, no caso dos
            dados necessários à emissão e guarda dos laudos técnicos; (iii) legítimo interesse,
            para melhoria dos nossos serviços e segurança do site; e (iv) consentimento, no caso
            de cookies não essenciais.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">4. Com quem compartilhamos</h2>
          <p className="mt-3">
            Não vendemos seus dados pessoais. Podemos compartilhar dados estritamente
            necessários com: prestadores de serviço que nos ajudam a operar (ex. hospedagem,
            envio de e-mail transacional), sempre sob obrigação contratual de confidencialidade
            e segurança; e órgãos públicos ou de fiscalização, quando exigido por lei ou
            regulamento aplicável ao serviço prestado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">5. Por quanto tempo guardamos</h2>
          <p className="mt-3">
            Mantemos os dados pelo tempo necessário para cumprir as finalidades descritas acima,
            incluindo o prazo exigido pela legislação aplicável aos registros técnicos de
            engenharia e à eventual responsabilização civil relacionada ao serviço prestado.
            Findo esse prazo, os dados são eliminados ou anonimizados, salvo obrigação legal de
            retenção por período diferente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">6. Segurança da informação</h2>
          <p className="mt-3">
            Adotamos medidas técnicas e administrativas para proteger os dados pessoais contra
            acessos não autorizados e situações de destruição, perda, alteração ou vazamento,
            incluindo controle de acesso por perfil de usuário (técnico, escritório e gerência),
            regras de restrição de acesso a nível de banco de dados e conexão criptografada
            entre seu navegador e nossos servidores.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">
            7. Seus direitos como titular dos dados
          </h2>
          <p className="mt-3">Nos termos do art. 18 da LGPD, você pode solicitar a qualquer momento:</p>
          <ul className="mt-3 list-disc space-y-1 pl-6">
            <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
            <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
            <li>Informação sobre com quem compartilhamos seus dados;</li>
            <li>Revogação do consentimento, quando aplicável.</li>
          </ul>
          <p className="mt-3">
            Para exercer esses direitos, entre em contato com nosso Encarregado de Dados (DPO)
            pelo e-mail{" "}
            <a href={`mailto:${COMPANY.encarregadoDados.email}`} className="underline hover:text-brand">
              {COMPANY.encarregadoDados.email}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-neutral-900">8. Alterações desta política</h2>
          <p className="mt-3">
            Podemos atualizar esta Política de Privacidade periodicamente. A data da última
            atualização está sempre indicada no topo desta página.
          </p>
        </section>

        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este documento foi elaborado como modelo alinhado à LGPD a partir dos dados e
          processos descritos pela empresa. Recomenda-se revisão por um profissional jurídico
          antes da publicação definitiva, especialmente quanto ao prazo de retenção de dados e
          à indicação formal do Encarregado de Dados (DPO).
        </section>
      </div>
    </div>
  );
}
