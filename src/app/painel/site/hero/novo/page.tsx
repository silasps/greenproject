import { requireRole } from "@/lib/auth/session";
import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { getServicos } from "@/lib/content/servicos";
import { SlideForm } from "../slide-form";

export default async function NovoSlidePage() {
  await requireRole(["gerencia"]);
  const servicos = await getServicos();

  return (
    <div>
      <ConfirmLeaveButton
        to="/painel/site/hero"
        label="← Voltar"
        variant="link"
        className="px-0 text-neutral-500"
      />
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Novo slide</h1>
      <SlideForm
        servicosDisponiveis={servicos.map((s) => ({ slug: s.slug, titulo: s.titulo }))}
        cancelHref="/painel/site/hero"
      />
    </div>
  );
}
