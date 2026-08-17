import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signedUrlSeguro } from "@/lib/storage/upload";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { ResponsavelForm } from "../../responsavel-form";

export default async function EditarResponsavelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("responsaveis_tecnicos");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: responsavel }, { data: usuarios }] = await Promise.all([
    supabase.from("responsaveis_tecnicos").select("*").eq("id", id).single(),
    // Contas superadmin (dono/desenvolvedor, só manutenção do sistema) não
    // são engenheiro/técnico da empresa — não entram como conta vinculável.
    supabase.from("usuarios_perfis").select("id, nome").eq("is_superadmin", false).order("nome"),
  ]);
  if (!responsavel) notFound();

  const assinaturaUrl = await signedUrlSeguro(responsavel.imagem_assinatura_path);

  return (
    <div className="mx-auto max-w-lg">
      <ConfirmLeaveButton to="/painel/responsaveis-tecnicos" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Editar responsável técnico</h1>
      <ResponsavelForm
        responsavel={responsavel}
        cancelHref="/painel/responsaveis-tecnicos"
        usuarios={usuarios ?? []}
        assinaturaUrl={assinaturaUrl}
      />
    </div>
  );
}
