import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/storage/upload";
import { formatDateBr } from "@/lib/utils/data";
import { ImagePreview } from "@/components/image-preview";

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

export default async function EquipamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["escritorio", "gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: eq } = await supabase
    .from("equipamentos_teste")
    .select(
      "*, criado:usuarios_perfis!equipamentos_teste_criado_por_fkey(nome), atualizado:usuarios_perfis!equipamentos_teste_atualizado_por_fkey(nome)",
    )
    .eq("id", id)
    .single();

  if (!eq) notFound();

  const hoje = new Date().toISOString().slice(0, 10);
  const vencido = eq.validade && eq.validade < hoje;

  let certificadoUrl: string | null = null;
  let certificadoEhImagem = false;
  if (eq.pdf_certificado_calibracao_path) {
    certificadoUrl = await signedUrl(eq.pdf_certificado_calibracao_path);
    const ext = eq.pdf_certificado_calibracao_path.split(".").pop()?.toLowerCase();
    certificadoEhImagem = IMAGE_EXT.includes(ext ?? "");
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/painel/equipamentos" className="text-sm text-neutral-500 hover:text-brand">
        ← Voltar
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">
          {eq.modelo} · {eq.numero_serie}
        </h1>
        <Link
          href={`/painel/equipamentos/${id}/editar`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Editar
        </Link>
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        <Item label="Tipo" value={eq.tipo === "opacimetro" ? "Opacímetro" : "Tacômetro"} />
        <Item label="Fabricante" value={eq.fabricante} />
        <Item label="Número INMETRO" value={eq.numero_inmetro} />
        <Item label="Data de aferição" value={formatDateBr(eq.data_afericao)} />
        <Item
          label="Validade"
          value={formatDateBr(eq.validade)}
          destaque={vencido ? "Aferição vencida" : undefined}
        />
      </dl>

      <div className="mt-6">
        <p className="text-sm font-medium text-neutral-700">Certificado de calibração</p>
        {certificadoUrl ? (
          certificadoEhImagem ? (
            <ImagePreview url={certificadoUrl} alt="Certificado de calibração" />
          ) : (
            <a href={certificadoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand underline">
              Abrir certificado (PDF)
            </a>
          )
        ) : (
          <p className="mt-2 text-sm text-neutral-400">Nenhum certificado enviado.</p>
        )}
      </div>

      <div className="mt-8 space-y-1 text-xs text-neutral-400">
        {eq.criado?.nome && <p>Cadastrado por {eq.criado.nome}</p>}
        {eq.atualizado?.nome && (
          <p>
            Última edição por {eq.atualizado.nome}
            {eq.atualizado_em && ` em ${new Date(eq.atualizado_em).toLocaleString("pt-BR")}`}
          </p>
        )}
      </div>
    </div>
  );
}

function Item({ label, value, destaque }: { label: string; value: string | null | undefined; destaque?: string }) {
  return (
    <div className="flex justify-between border-b border-neutral-100 py-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={destaque ? "font-semibold text-red-600" : "font-medium text-neutral-900"}>
        {destaque ?? value ?? "—"}
      </dd>
    </div>
  );
}
