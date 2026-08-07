import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ShieldCheck, MessageCircle } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { canImportarPdfSyscon, canRevisarELiberarLaudo } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrl, publicUrl } from "@/lib/storage/upload";
import { COMPANY } from "@/lib/legal/company-info";
import { linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import { diasRestantes } from "@/lib/laudo/validade";
import { CampoWizard } from "./campo-wizard";
import { CampoEditForm } from "./campo-edit-form";
import { ImportSysconForm } from "./import-syscon-form";
import { LiberarForm } from "./liberar-form";
import { DevolverRevisaoButton } from "./devolver-revisao-button";
import { EnviarLaudoEmailButton } from "./enviar-laudo-email-button";
import { FotosPreviewGrid, PdfPreview } from "@/components/foto-preview";

const STATUS_LABEL: Record<string, string> = {
  aguardando_execucao: "Aguardando execução em campo",
  aguardando_pdf_syscon: "Aguardando PDF do opacímetro",
  aguardando_revisao: "Aguardando revisão",
  aprovado: "Laudo emitido",
};

export default async function TesteDetalhePage({ params }: { params: Promise<{ testeId: string }> }) {
  const { perfil } = await requireAuth();
  const { testeId } = await params;
  const supabase = await createClient();

  const { data: teste } = await supabase
    .from("testes_opacidade")
    .select(
      "*, veiculos_maquinas(*, clientes(*)), equipamentos_teste(modelo, numero_serie), testes_opacidade_medicoes(*)",
    )
    .eq("id", testeId)
    .single();

  if (!teste) notFound();

  const veiculo = teste.veiculos_maquinas;
  const cliente = veiculo?.clientes;

  return (
    <div className="mx-auto max-w-lg lg:max-w-2xl xl:max-w-3xl">
      <h1 className="text-2xl font-bold text-neutral-900">
        {cliente?.nome} · {veiculo?.identificador}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{STATUS_LABEL[teste.status] ?? teste.status}</p>

      {teste.status === "aguardando_execucao" && (
        <CampoSection testeId={testeId} />
      )}

      {teste.status !== "aguardando_execucao" && (
        <CampoEditSection testeId={testeId} teste={teste} />
      )}

      {teste.status === "aguardando_pdf_syscon" && (
        <div className="mt-6">
          <p className="text-sm text-neutral-600">
            Número do teste informado em campo: <strong>{teste.numero_teste}</strong>
          </p>
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
        <RevisaoSection testeId={testeId} teste={teste} podeLiberar={canRevisarELiberarLaudo(perfil.role)} />
      )}

      {teste.status === "aprovado" && <EmitidoSection testeId={testeId} />}
    </div>
  );
}

async function CampoSection({ testeId }: { testeId: string }) {
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
    ].map(
      async ([label, path]) =>
        [label, path ? await signedUrl(path) : null, path] as [string, string | null, string | null],
    ),
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
async function RevisaoSection({ testeId, teste, podeLiberar }: { testeId: string; teste: any; podeLiberar: boolean }) {
  const fotosExtras: string[] = teste.fotos_extras ?? [];
  const [pdfUrl, extrasUrls] = await Promise.all([
    teste.pdf_ensaio_original_path ? signedUrl(teste.pdf_ensaio_original_path) : Promise.resolve(null),
    Promise.all(
      fotosExtras.map(
        async (path, i) => [`Extra ${i + 1}`, await signedUrl(path), path] as [string, string | null, string | null],
      ),
    ),
  ]);

  const medicoes = (teste.testes_opacidade_medicoes ?? []).sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.ciclo_aceleracao - b.ciclo_aceleracao,
  );

  let responsaveis: { id: string; label: string }[] = [];
  if (podeLiberar) {
    const admin = createAdminClient();
    const { data } = await admin.from("responsaveis_tecnicos").select("id, nome");
    responsaveis = (data ?? []).map((r) => ({ id: r.id, label: r.nome }));
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-md border border-neutral-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-700">Resultado do ensaio</p>
            <p className="mt-2 text-sm text-neutral-600">
              <strong className="uppercase">{teste.resultado ?? "-"}</strong> · Média: {teste.media_m1 ?? "-"} m-1
            </p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {medicoes.map((m: any) => (
              <p key={m.id} className="text-sm text-neutral-500">
                Ciclo {m.ciclo_aceleracao}: {m.opacidade_m1} m-1
              </p>
            ))}
          </div>
          {pdfUrl && teste.pdf_ensaio_original_path && (
            <PdfPreview url={pdfUrl} path={teste.pdf_ensaio_original_path} label="PDF do ensaio" />
          )}
        </div>
        <FotosPreviewGrid fotos={extrasUrls} />
      </div>

      <div className="rounded-md border border-neutral-200 p-4">
        <p className="text-sm font-medium text-neutral-700">Liberar laudo</p>
        <div className="mt-2">
          {podeLiberar ? (
            <LiberarForm testeId={testeId} responsaveis={responsaveis} />
          ) : (
            <p className="text-sm text-neutral-500">Aguardando a gerência revisar e liberar o laudo.</p>
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

async function EmitidoSection({ testeId }: { testeId: string }) {
  const admin = createAdminClient();
  const { data: laudo } = await admin
    .from("laudos")
    .select(
      "numero, codigo_publico, pdf_path, emitido_em, testes_opacidade(resultado, veiculos_maquinas(identificador, marca, modelo), agendamentos(data_hora, whatsapp_contato, telefone_contato))",
    )
    .eq("teste_id", testeId)
    .single();

  if (!laudo) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teste = laudo.testes_opacidade as any;
  const agendamento = teste?.agendamentos;
  const veiculo = teste?.veiculos_maquinas;
  const telefoneContato = agendamento?.whatsapp_contato || agendamento?.telefone_contato || "";
  const aprovado = teste?.resultado === "aprovado";
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
      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-20 flex-col items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-center text-xs text-brand hover:border-brand/40 hover:bg-brand/5"
        >
          <Download className="size-4" />
          Baixar PDF
        </a>
        <Link
          href={`/laudo/${laudo.codigo_publico}`}
          target="_blank"
          className="flex w-20 flex-col items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-center text-xs text-brand hover:border-brand/40 hover:bg-brand/5"
        >
          <ShieldCheck className="size-4" />
          Página de verificação
        </Link>
        <a
          href={linkWpp}
          target="_blank"
          rel="noreferrer"
          className="flex w-20 flex-col items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-center text-xs text-brand hover:border-brand/40 hover:bg-brand/5"
        >
          <MessageCircle className="size-4" />
          Enviar por WhatsApp
        </a>
        <EnviarLaudoEmailButton testeId={testeId} />
      </div>
    </div>
  );
}
