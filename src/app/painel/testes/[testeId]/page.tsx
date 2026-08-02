import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { canImportarPdfSyscon, canRevisarELiberarLaudo } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedUrl, publicUrl } from "@/lib/storage/upload";
import { COMPANY } from "@/lib/legal/company-info";
import { CampoForm } from "./campo-form";
import { ImportSysconForm } from "./import-syscon-form";
import { LiberarForm } from "./liberar-form";

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
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">
        {cliente?.nome} · {veiculo?.identificador}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">{STATUS_LABEL[teste.status] ?? teste.status}</p>

      {teste.status === "aguardando_execucao" && (
        <CampoSection testeId={testeId} />
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
    <CampoForm
      testeId={testeId}
      equipamentos={(equipamentos ?? []).map((e) => ({ id: e.id, label: `${e.modelo} · ${e.numero_serie}` }))}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function RevisaoSection({ testeId, teste, podeLiberar }: { testeId: string; teste: any; podeLiberar: boolean }) {
  const fotosExtras: string[] = teste.fotos_extras ?? [];
  const links = await Promise.all(
    [
      ["Frente", teste.foto_frente_path],
      ["Teste sendo feito", teste.foto_traseira_path],
      ["Painel", teste.foto_painel_path],
      ["Etiqueta", teste.foto_etiqueta_path],
      ["PDF do ensaio", teste.pdf_ensaio_original_path],
      ...fotosExtras.map((path, i) => [`Extra ${i + 1}`, path] as const),
    ].map(async ([label, path]) => [label, path ? await signedUrl(path) : null] as const),
  );

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
      <div>
        <p className="text-sm text-neutral-600">
          Resultado do ensaio: <strong className="uppercase">{teste.resultado ?? "-"}</strong> · Média:{" "}
          {teste.media_m1 ?? "-"} m-1
        </p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {medicoes.map((m: any) => (
          <p key={m.id} className="text-sm text-neutral-500">
            Ciclo {m.ciclo_aceleracao}: {m.opacidade_m1} m-1
          </p>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {links.map(([label, url]) =>
          url ? (
            <a key={label} href={url} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
              {label}
            </a>
          ) : null,
        )}
      </div>

      {podeLiberar ? (
        <LiberarForm testeId={testeId} responsaveis={responsaveis} />
      ) : (
        <p className="text-sm text-neutral-500">Aguardando a gerência revisar e liberar o laudo.</p>
      )}
    </div>
  );
}

async function EmitidoSection({ testeId }: { testeId: string }) {
  const admin = createAdminClient();
  const { data: laudo } = await admin
    .from("laudos")
    .select("numero, codigo_publico, pdf_path")
    .eq("teste_id", testeId)
    .single();

  if (!laudo) return null;

  const pdfUrl = publicUrl("laudos", laudo.pdf_path);
  const verificacaoUrl = `${COMPANY.siteUrl}/laudo/${laudo.codigo_publico}`;
  const mensagem = encodeURIComponent(`Olá! Segue o laudo ${laudo.numero}: ${verificacaoUrl}`);

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-neutral-600">Laudo nº {laudo.numero} emitido.</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-brand underline">
          Baixar PDF
        </a>
        <Link href={`/laudo/${laudo.codigo_publico}`} target="_blank" className="text-brand underline">
          Página de verificação
        </Link>
        <a
          href={`https://wa.me/?text=${mensagem}`}
          target="_blank"
          rel="noreferrer"
          className="text-brand underline"
        >
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
