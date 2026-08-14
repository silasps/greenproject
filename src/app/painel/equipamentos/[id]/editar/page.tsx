import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { baixarArquivoInterno, detectarTipoArquivo, signedUrlSeguro } from "@/lib/storage/upload";
import { EquipamentoForm } from "../../equipamento-form";

export default async function EditarEquipamentoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("equipamentos");
  const { id } = await params;
  const supabase = await createClient();
  const { data: equipamento } = await supabase.from("equipamentos_teste").select("*").eq("id", id).single();
  if (!equipamento) notFound();

  const [certificadoUrl, seloUrl, certificadoBuf] = await Promise.all([
    signedUrlSeguro(equipamento.pdf_certificado_calibracao_path),
    signedUrlSeguro(equipamento.selo_imagem_path),
    baixarArquivoInterno(equipamento.pdf_certificado_calibracao_path),
  ]);
  // Detecta pelos bytes reais, não pela extensão do path — já existiu um
  // certificado salvo como .pdf que na verdade era uma imagem WebP.
  const certificadoTipo = certificadoBuf ? detectarTipoArquivo(certificadoBuf) : null;
  const certificadoEhImagem = certificadoTipo === "jpeg" || certificadoTipo === "png" || certificadoTipo === "webp";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-neutral-900">Editar equipamento</h1>
      <EquipamentoForm
        equipamento={equipamento}
        cancelHref={`/painel/equipamentos/${id}`}
        certificadoUrl={certificadoUrl}
        certificadoEhImagem={certificadoEhImagem}
        seloUrl={seloUrl}
      />
    </div>
  );
}
