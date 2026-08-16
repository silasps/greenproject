import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ShieldCheck, MessageCircle } from "lucide-react";
import { requireAuth, getMeuResponsavelTecnicoId } from "@/lib/auth/session";
import { canImportarPdfSyscon } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrlSeguro, publicUrl } from "@/lib/storage/upload";
import { COMPANY } from "@/lib/legal/company-info";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { diasRestantes } from "@/lib/laudo/validade";
import { resolverLimitesTeste, limitesTesteFaltando } from "@/lib/laudo/limites-teste";
import { CampoWizard } from "./campo-wizard";
import { CampoEditForm } from "./campo-edit-form";
import { ImportSysconForm } from "./import-syscon-form";
import { LiberarForm } from "./liberar-form";
import { DevolverRevisaoButton } from "./devolver-revisao-button";
import { EnviarLaudoEmailButton } from "./enviar-laudo-email-button";
import { LaudoPreviewCard } from "./laudo-preview-card";
import { VisualizarLaudoButton } from "./visualizar-laudo-button";
import { FotosPreviewGrid, PdfPreview } from "@/components/foto-preview";

const STATUS_LABEL: Record<string, string> = {
  aguardando_execucao: "Aguardando execução em campo",
  aguardando_pdf_syscon: "Aguardando PDF do opacímetro",
  aguardando_revisao: "Aguardando revisão",
  aprovado: "Laudo emitido",
};

const STATUS_CLASSE: Record<string, string> = {
  aguardando_execucao: "bg-neutral-100 text-neutral-600",
  aguardando_pdf_syscon: "bg-amber-100 text-amber-800",
  aguardando_revisao: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-800",
};

export default async function TesteDetalhePage({ params }: { params: Promise<{ testeId: string }> }) {
  const { perfil } = await requireAuth();
  const { testeId } = await params;
  const supabase = await createClient();

  const { data: teste } = await supabase
    .from("testes_opacidade")
    .select(
      "*, veiculos_maquinas(*, clientes(*), especificacoes_motor(*)), equipamentos_teste(*), testes_opacidade_medicoes(*)",
    )
    .eq("id", testeId)
    .single();

  if (!teste) notFound();

  const veiculo = teste.veiculos_maquinas;
  const cliente = veiculo?.clientes;

  return (
    <div className="mx-auto max-w-lg lg:max-w-2xl xl:max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
        {cliente?.nome} · {veiculo?.identificador}
      </h1>
      <span
        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_CLASSE[teste.status] ?? "bg-neutral-100 text-neutral-600"}`}
      >
        {STATUS_LABEL[teste.status] ?? teste.status}
      </span>

      {teste.status === "aguardando_execucao" && (
        <CampoSection testeId={testeId} teste={teste} />
      )}

      {teste.status !== "aguardando_execucao" && (
        <CampoEditSection testeId={testeId} teste={teste} />
      )}

      {teste.status === "aguardando_pdf_syscon" && (
        <div className="mt-6">
          {/* Número do teste já aparece (e é editável) no card "Dados de campo" acima — evita ter dois lugares mostrando o mesmo dado, um deles podendo ficar desatualizado. */}
          {canImportarPdfSyscon(perfil.role) ? (
            <ImportSysconForm testeId={testeId} />
          ) : (
            <p className="mt-4 text-sm text-neutral-500">
              Aguardando o escritório importar o PDF exportado pelo opacímetro.
            </p>
          )}
        </div>
      )}

      {teste.status === "aguardando_revisao" && (
        <RevisaoSection testeId={testeId} teste={teste} meuResponsavelId={await getMeuResponsavelTecnicoId(perfil.id)} />
      )}

      {teste.status === "aprovado" && <EmitidoSection testeId={testeId} teste={teste} />}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function CampoSection({ testeId, teste }: { testeId: string; teste: any }) {
  const supabase = await createClient();
  const { data: equipamentos } = await supabase
    .from("equipamentos_teste")
    .select("id, modelo, numero_serie")
    .eq("tipo", "opacimetro")
    .order("modelo");

  return (
    <CampoWizard
      testeId={testeId}
      equipamentos={(equipamentos ?? []).map((e) => ({ id: e.id, label: `${e.modelo} · ${e.numero_serie}` }))}
      veiculo={
        teste.veiculos_maquinas
          ? {
              id: teste.veiculos_maquinas.id,
              marca: teste.veiculos_maquinas.marca ?? "",
              identificacaoMotor: teste.veiculos_maquinas.identificacao_motor ?? null,
              especificacao: teste.veiculos_maquinas.especificacoes_motor ?? null,
            }
          : null
      }
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function CampoEditSection({ testeId, teste }: { testeId: string; teste: any }) {
  const supabase = await createClient();
  const { data: equipamentos } = await supabase
    .from("equipamentos_teste")
    .select("id, modelo, numero_serie")
    .eq("tipo", "opacimetro")
    .order("modelo");

  const fotosAtuais = await Promise.all(
    [
      ["Frente", teste.foto_frente_path],
      ["Teste sendo feito", teste.foto_traseira_path],
      ["Painel", teste.foto_painel_path],
      ["Etiqueta", teste.foto_etiqueta_path],
      ["Etiqueta — número", teste.foto_etiqueta_numero_path],
    ].map(async ([label, path]) => [label, await signedUrlSeguro(path), path] as [string, string | null, string | null]),
  );

  return (
    <CampoEditForm
      testeId={testeId}
      numeroTeste={teste.numero_teste}
      equipamentoId={teste.equipamento_id}
      equipamentos={(equipamentos ?? []).map((e) => ({ id: e.id, label: `${e.modelo} · ${e.numero_serie}` }))}
      fotosAtuais={fotosAtuais}
      bloqueado={teste.status === "aprovado"}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function RevisaoSection({ testeId, teste, meuResponsavelId }: { testeId: string; teste: any; meuResponsavelId: string | null }) {
  const podeLiberar = !!meuResponsavelId;
  const cliente = teste.veiculos_maquinas?.clientes;
  const fotosExtras: string[] = teste.fotos_extras ?? [];

  const [pdfUrl, extrasUrls] = await Promise.all([
    signedUrlSeguro(teste.pdf_ensaio_original_path),
    Promise.all(
      fotosExtras.map(
        async (path, i) => [`Extra ${i + 1}`, await signedUrlSeguro(path), path] as [string, string | null, string | null],
      ),
    ),
  ]);

  let responsaveis: { id: string; label: string }[] = [];
  if (podeLiberar) {
    const admin = createAdminClient();
    const { data } = await admin.from("responsaveis_tecnicos").select("id, nome");
    responsaveis = (data ?? []).map((r) => ({ id: r.id, label: r.nome }));
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Prévia de como o laudo vai sair, pra dar confiança antes de validar — "Editar dados de campo" só pula pro
          card que já existe acima (id="dados-campo"), sem duplicar o form de edição aqui. */}
      <LaudoPreviewCard teste={teste} mostrarEditar />

      {(pdfUrl || extrasUrls.length > 0) && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-neutral-800">Arquivos do ensaio</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {pdfUrl && teste.pdf_ensaio_original_path && (
              <PdfPreview url={pdfUrl} path={teste.pdf_ensaio_original_path} label="PDF do ensaio" />
            )}
          </div>
          <FotosPreviewGrid fotos={extrasUrls} />
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-800">Validar teste</p>
        <div className="mt-3">
          {podeLiberar ? (
            <LiberarForm
              testeId={testeId}
              responsaveis={responsaveis}
              defaultResponsavelId={meuResponsavelId}
              resultado={teste.resultado}
              clienteEmail={cliente?.email ?? null}
              limitesFaltando={limitesTesteFaltando(resolverLimitesTeste(teste, teste.veiculos_maquinas?.especificacoes_motor))}
            />
          ) : (
            <p className="text-sm text-neutral-500">Aguardando um engenheiro responsável revisar e liberar o laudo.</p>
          )}
        </div>
        {podeLiberar && (
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <DevolverRevisaoButton testeId={testeId} />
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function EmitidoSection({ testeId, teste }: { testeId: string; teste: any }) {
  const admin = createAdminClient();
  const { data: laudo } = await admin
    .from("laudos")
    .select(
      "numero, codigo_publico, pdf_path, emitido_em, responsaveis_tecnicos(nome, formacao, registro_conselho, contato), testes_opacidade(agendamentos(data_hora, whatsapp_contato, telefone_contato))",
    )
    .eq("teste_id", testeId)
    .single();

  if (!laudo) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agendamento = (laudo.testes_opacidade as any)?.agendamentos;
  const veiculo = teste.veiculos_maquinas;
  const telefoneContato = agendamento?.whatsapp_contato || agendamento?.telefone_contato || "";
  const aprovado = teste.resultado === "aprovado";
  const dataHoraTexto = agendamento?.data_hora
    ? format(new Date(agendamento.data_hora), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : "-";
  const validade = new Date(laudo.emitido_em);
  validade.setFullYear(validade.getFullYear() + 1);
  const diasParaVencer = diasRestantes(validade.toISOString());
  const validadeTexto = validade.toLocaleDateString("pt-BR");
  const validadeBadge =
    diasParaVencer < 0
      ? { label: `Vencido há ${Math.abs(diasParaVencer)} dia${Math.abs(diasParaVencer) === 1 ? "" : "s"}`, classe: "bg-red-100 text-red-700" }
      : diasParaVencer <= 60
        ? { label: `Vence em ${diasParaVencer} dia${diasParaVencer === 1 ? "" : "s"}`, classe: "bg-amber-100 text-amber-800" }
        : { label: "Válido", classe: "bg-green-100 text-green-800" };

  const pdfUrl = publicUrl("laudos", laudo.pdf_path);
  const verificacaoUrl = `${COMPANY.siteUrl}/laudo/${laudo.codigo_publico}`;
  const mensagemTexto = [
    "Segue o laudo de opacidade realizado em " + dataHoraTexto + ".",
    "",
    `*Empresa:* ${COMPANY.razaoSocial}`,
    veiculo ? `*Veículo/equipamento:* ${veiculo.identificador} ${[veiculo.marca, veiculo.modelo].filter(Boolean).join(" ")}` : null,
    `*Resultado:* ${aprovado ? "APROVADO" : "REPROVADO"}`,
    "",
    `Ver e baixar o laudo: ${verificacaoUrl}`,
    "",
    "Qualquer dúvida, estamos à disposição!",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
  const linkWpp = telefoneContato
    ? linkWhatsapp(telefoneContato, mensagemTexto)
    : `https://wa.me/?text=${encodeURIComponent(mensagemTexto)}`;

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-neutral-600">Laudo nº {laudo.numero} emitido.</p>
      <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
        Válido até <strong>{validadeTexto}</strong>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${validadeBadge.classe}`}>{validadeBadge.label}</span>
      </p>
      <div className="flex flex-wrap gap-2.5">
        <a
          href={linkWpp}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <MessageCircle className="size-4" />
          Enviar por WhatsApp
        </a>
        <EnviarLaudoEmailButton testeId={testeId} />
        <VisualizarLaudoButton>
          <LaudoPreviewCard
            teste={teste}
            mostrarEditar={false}
            numero={laudo.numero}
            dataEmissao={laudo.emitido_em}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responsavel={laudo.responsaveis_tecnicos as any}
          />
        </VisualizarLaudoButton>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full border-2 border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <Download className="size-4" />
          Baixar PDF
        </a>
        <Link
          href={`/laudo/${laudo.codigo_publico}`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-full border-2 border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          <ShieldCheck className="size-4" />
          Página de verificação
        </Link>
      </div>
    </div>
  );
}
