import { ConfirmLeaveButton } from "@/components/confirm-leave-button";
import { VerNoSiteButton } from "@/components/ver-no-site-button";
import { requireArea } from "@/lib/auth/session";
import { getPaginaSobre } from "@/lib/content/pagina-sobre";
import { SobreForm } from "./sobre-form";

export default async function SitePaginaSobrePage() {
  await requireArea("site");
  const sobre = await getPaginaSobre();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <ConfirmLeaveButton to="/painel/site" label="← Voltar" variant="link" className="px-0 text-neutral-500" />
          <h1 className="mt-2 text-2xl font-bold text-neutral-900">Página Sobre</h1>
        </div>
        <VerNoSiteButton href="/sobre" />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-neutral-500">
        O bloco de dados da empresa (razão social, CNPJ, endereço) é editado em
        Configurações → Empresa.
      </p>
      <SobreForm sobre={sobre} />
    </div>
  );
}
