import { Pencil } from "lucide-react";
import { signedUrlSeguro } from "@/lib/storage/upload";
import { textoConclusao } from "@/lib/laudo/texto-conclusao";
import { FotoPreview, PdfPreview } from "@/components/foto-preview";

type Responsavel = {
  nome: string;
  formacao: string | null;
  registro_conselho: string | null;
  contato: string | null;
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-t-lg bg-brand px-4 py-1.5 text-center text-xs font-semibold tracking-wide text-white uppercase">
      {children}
    </div>
  );
}

function Campo({ label, valor, className = "" }: { label: string; valor: React.ReactNode; className?: string }) {
  return (
    <div className={`border-neutral-100 p-2.5 ${className}`}>
      <span className="block text-[11px] tracking-wide text-neutral-400 uppercase">{label}</span>
      <span className="text-sm text-neutral-800">{valor ?? "-"}</span>
    </div>
  );
}

/**
 * Prévia do laudo — mesma estrutura/redação do documento final
 * (`gerar-pdf.ts`), mas incluindo tudo que o laudo de referência do
 * cliente também mostra (ano/modelo, telefone do contratante, chassi e
 * renavam separados, identificação de quem assina). Reaproveitada em dois
 * lugares: na revisão (antes de validar, com o link "Editar dados de
 * campo") e no laudo já emitido (`VisualizarLaudoButton`, só leitura —
 * `mostrarEditar=false`) pra ver o laudo sem precisar baixar o PDF.
 *
 * `numero`/`dataEmissao`/`responsavel` só existem depois de validado (o
 * `laudos.responsavel_tecnico_id` é definitivo ali — antes disso o
 * responsável ainda está sendo escolhido no form abaixo, não dá pra
 * cravar na prévia).
 */
export async function LaudoPreviewCard({
  teste,
  mostrarEditar,
  numero,
  dataEmissao,
  responsavel,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teste: any;
  mostrarEditar: boolean;
  numero?: string | null;
  dataEmissao?: string | null;
  responsavel?: Responsavel | null;
}) {
  const veiculo = teste.veiculos_maquinas;
  const cliente = veiculo?.clientes;
  const especificacao = veiculo?.especificacoes_motor;
  const equipamento = teste.equipamentos_teste;

  const fotosDocumento = await Promise.all(
    [
      ["Frente do veículo", teste.foto_frente_path],
      ["Teste sendo realizado", teste.foto_traseira_path],
      ["Painel / odômetro", teste.foto_painel_path],
    ].map(async ([label, path]) => [label, await signedUrlSeguro(path), path] as [string, string | null, string | null]),
  );

  const certificadoUrl = await signedUrlSeguro(equipamento?.pdf_certificado_calibracao_path);

  const medicoes = (teste.testes_opacidade_medicoes ?? []).sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.ciclo_aceleracao - b.ciclo_aceleracao,
  );

  const aprovado = teste.resultado === "aprovado";
  const statusPill = teste.resultado ? (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
        aprovado ? "bg-brand/10 text-brand-dark" : "bg-red-50 text-red-600"
      }`}
    >
      {teste.resultado}
    </span>
  ) : null;

  const veiculoLabel = `${veiculo?.marca ?? ""} ${veiculo?.modelo ?? ""} - ${veiculo?.identificador ?? ""}`.trim();

  // Prioriza os limites extraídos do PDF do Syscon na importação (por ensaio,
  // mais confiável) — só cai pro cadastro do veículo (especificacoes_motor,
  // manual/opcional) se o teste ainda não tiver sido (re)importado depois
  // dessa mudança.
  const limiteMarchaLenta =
    teste.limite_marcha_lenta_min != null || teste.limite_marcha_lenta_max != null
      ? [teste.limite_marcha_lenta_min, teste.limite_marcha_lenta_max]
      : [especificacao?.marcha_lenta_min, especificacao?.marcha_lenta_max];
  const limiteRotacaoCorte =
    teste.limite_rotacao_corte_min != null || teste.limite_rotacao_corte_max != null
      ? [teste.limite_rotacao_corte_min, teste.limite_rotacao_corte_max]
      : [especificacao?.rotacao_corte_min, especificacao?.rotacao_corte_max];
  const limiteOpacidade = teste.limite_opacidade ?? especificacao?.limite_opacidade;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-neutral-800">
            Prévia do laudo{numero ? ` · Nº ${numero}` : ""}
          </p>
          <p className="text-xs text-neutral-500">
            {mostrarEditar
              ? "É assim que o laudo vai sair — confira antes de validar."
              : `Laudo emitido${dataEmissao ? ` em ${new Date(dataEmissao).toLocaleDateString("pt-BR")}` : ""}.`}
          </p>
        </div>
        {mostrarEditar && (
          <a
            href="#dados-campo"
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
          >
            <Pencil className="size-3.5" />
            Editar dados de campo
          </a>
        )}
      </div>

      <div className="space-y-5 p-5">
        <div>
          <SectionHeader>Dados do veículo/máquina e proprietário</SectionHeader>
          <div className="grid grid-cols-1 divide-y divide-neutral-100 rounded-b-lg border border-t-0 border-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <Campo label="Contratante" valor={cliente?.nome} className="sm:border-b sm:border-neutral-100" />
            <Campo label="CNPJ/CPF" valor={cliente?.cnpj_cpf} className="sm:border-b sm:border-neutral-100" />
            <Campo
              label="Marca/Modelo"
              valor={[veiculo?.marca, veiculo?.modelo].filter(Boolean).join(" ") || null}
              className="sm:border-b sm:border-neutral-100"
            />
            <div className="grid grid-cols-2 sm:border-b sm:border-neutral-100">
              <Campo label="Placa/Identificador" valor={veiculo?.identificador} className="border-r border-neutral-100" />
              <Campo label="Ano" valor={veiculo?.ano} />
            </div>
            <Campo label="Chassi" valor={veiculo?.chassi} className="sm:border-b sm:border-neutral-100" />
            <div className="grid grid-cols-2 sm:border-b sm:border-neutral-100">
              <Campo label="Renavam" valor={veiculo?.renavam} className="border-r border-neutral-100" />
              <Campo label="Combustível" valor={veiculo?.combustivel} />
            </div>
            {/* Km atual vem do PDF do Syscon (por ensaio, não do cadastro do veículo — a
                quilometragem muda a cada teste). */}
            <Campo
              label="Km atual"
              valor={teste.km_atual != null ? Number(teste.km_atual).toLocaleString("pt-BR") : null}
              className="sm:col-span-2 sm:border-b sm:border-neutral-100"
            />
            <Campo label="Endereço" valor={cliente?.endereco} className="sm:col-span-2 sm:border-b sm:border-neutral-100" />
            <Campo label="Telefone do contratante" valor={cliente?.telefone} className="sm:col-span-2" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Fotos do ensaio</p>
          {/* Fotos grandes (não a miniatura de 64px do FotosPreviewGrid) — aqui é a prévia do documento
              em si, mesmo padrão de 3 colunas do laudo em PDF (gerar-pdf.ts), não uma lista de arquivos. */}
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {fotosDocumento
              .filter((f): f is [string, string, string] => !!f[1] && !!f[2])
              .map(([label, url, path]) => (
                <FotoPreview key={label} url={url} path={path} label={label} size="lg" />
              ))}
          </div>
        </div>

        <div>
          <SectionHeader>Dados do ensaio</SectionHeader>
          <div className="rounded-b-lg border border-t-0 border-neutral-100 p-3">
            <p className="text-sm text-neutral-600">
              Número do ensaio: <strong className="text-neutral-800">{teste.numero_teste ?? "-"}</strong> · Média:{" "}
              <strong className="text-neutral-800">{teste.media_m1 ?? "-"} m-1</strong>
              {limiteOpacidade != null && <> · Limite de opacidade: {limiteOpacidade} m-1</>}
            </p>
            {(limiteMarchaLenta[0] != null || limiteRotacaoCorte[0] != null) && (
              <p className="mt-1 text-sm text-neutral-600">
                {limiteMarchaLenta[0] != null && (
                  <>
                    Limite marcha lenta: <strong className="text-neutral-800">{limiteMarchaLenta[0]} - {limiteMarchaLenta[1]}</strong> RPM
                  </>
                )}
                {limiteMarchaLenta[0] != null && limiteRotacaoCorte[0] != null && " · "}
                {limiteRotacaoCorte[0] != null && (
                  <>
                    Limite rotação de corte: <strong className="text-neutral-800">{limiteRotacaoCorte[0]} - {limiteRotacaoCorte[1]}</strong> RPM
                  </>
                )}
              </p>
            )}
            {mostrarEditar && (limiteMarchaLenta[0] == null || limiteRotacaoCorte[0] == null || limiteOpacidade == null) && (
              <p className="mt-1 text-sm text-amber-700">
                Faltam os limites de marcha lenta, rotação de corte e/ou opacidade — vêm do PDF do Syscon. Sem eles não
                dá pra validar o teste.
              </p>
            )}
            <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs tracking-wide text-neutral-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-center">Aceleração</th>
                    <th className="px-3 py-2 text-center">Rotação de corte</th>
                    <th className="px-3 py-2 text-center">Tempo</th>
                    <th className="px-3 py-2 text-center">Opacidade K(m-1)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {medicoes.map((m: any) => (
                    <tr key={m.id} className="border-t border-neutral-100">
                      <td className="px-3 py-2 text-center font-medium text-neutral-700">{m.ciclo_aceleracao}</td>
                      <td className="px-3 py-2 text-center text-neutral-600">{m.rotacao_corte ?? "-"}</td>
                      <td className="px-3 py-2 text-center text-neutral-600">{m.tempo_segundos ?? 4}s</td>
                      <td className="px-3 py-2 text-center font-medium text-brand-dark">{m.opacidade_m1 ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader>Dados do opacímetro</SectionHeader>
          <div className="rounded-b-lg border border-t-0 border-neutral-100 p-3">
            <p className="text-sm text-neutral-600">
              Modelo: <span className="text-neutral-800">{equipamento?.modelo ?? "-"}</span> · Serial:{" "}
              <span className="text-neutral-800">{equipamento?.numero_serie ?? "-"}</span> · Válido até:{" "}
              <span className="text-neutral-800">
                {equipamento?.validade ? new Date(equipamento.validade).toLocaleDateString("pt-BR") : "-"}
              </span>{" "}
              · Fabricante: <span className="text-neutral-800">{equipamento?.fabricante ?? "-"}</span>
            </p>
            {certificadoUrl && equipamento.pdf_certificado_calibracao_path && (
              <div className="mt-3">
                <PdfPreview
                  url={certificadoUrl}
                  path={equipamento.pdf_certificado_calibracao_path}
                  label="Certificado de calibração (INMETRO)"
                  size="lg"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeader>Conclusão</SectionHeader>
          <div className="rounded-b-lg border border-t-0 border-neutral-100 p-4">
            <p className="text-sm leading-relaxed text-neutral-700">{textoConclusao(teste.resultado, veiculoLabel)}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-800">Resultado:</span>
              {statusPill}
            </div>
          </div>
        </div>

        {responsavel && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Responsável técnico</p>
              <p className="mt-1 text-neutral-800">{responsavel.nome}</p>
              <p className="text-neutral-500">
                {[responsavel.formacao, responsavel.registro_conselho].filter(Boolean).join(" · ") || "-"}
              </p>
            </div>
            {responsavel.contato && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Contato</p>
                <p className="mt-1 text-neutral-800">{responsavel.contato}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
