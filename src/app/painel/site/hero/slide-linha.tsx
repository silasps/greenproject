"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { MoverOrdemSlideBotoes } from "./mover-ordem-slide-botoes";
import { ExcluirSlideBotao } from "./excluir-slide-botao";

type SlideLista = {
  id: string;
  servico: string;
  descricao: string;
  imagem_url: string;
  imagem_alt: string;
};

// Mesmo padrão de servico-linha.tsx: a linha inteira navega pra edição, mas
// tem botões de verdade dentro (reordenar, excluir), então é uma div com
// onClick + role="link" em vez de um <Link> (que não pode conter elementos
// interativos).
export function SlideLinha({
  slide,
  podeSubir,
  podeDescer,
}: {
  slide: SlideLista;
  podeSubir: boolean;
  podeDescer: boolean;
}) {
  const router = useRouter();
  const href = `/painel/site/hero/${slide.id}/editar`;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:border-brand/40 hover:shadow-sm"
    >
      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
        <Image src={slide.imagem_url} alt={slide.imagem_alt} fill sizes="80px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <span className="truncate font-medium text-neutral-900">{slide.servico}</span>
        <p className="truncate text-sm text-neutral-500">{slide.descricao}</p>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-2">
        <MoverOrdemSlideBotoes id={slide.id} podeSubir={podeSubir} podeDescer={podeDescer} />
        <ExcluirSlideBotao id={slide.id} servico={slide.servico} />
      </div>
    </div>
  );
}
