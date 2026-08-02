import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { richTextClasses } from "@/components/rich-text-editor";
import { excluirFuncao } from "../../actions";

export default async function FuncaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["gerencia"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: funcao } = await supabase
    .from("funcoes")
    .select("id, nome, descricao, nivel_acesso")
    .eq("id", id)
    .single();

  if (!funcao) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/painel/dp/funcoes" className="text-sm text-neutral-500 hover:underline">
        ← Voltar
      </Link>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{funcao.nome}</h1>
        <span className="text-sm text-neutral-400">{ROLE_LABELS[funcao.nivel_acesso as Role]}</span>
      </div>

      {funcao.descricao && (
        <div
          className={`mt-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm ${richTextClasses}`}
          dangerouslySetInnerHTML={{ __html: funcao.descricao }}
        />
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href={`/painel/dp/funcoes/${id}/editar`}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Editar função
        </Link>
        <ConfirmDeleteButton
          label="Excluir função"
          title="Excluir esta função?"
          description="Pessoas com esta função ficam sem função definida. Essa ação não pode ser desfeita."
          onConfirm={excluirFuncao.bind(null, id)}
        />
      </div>
    </div>
  );
}
