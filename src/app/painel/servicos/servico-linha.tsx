"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { MoverOrdemBotoes } from "./mover-ordem-botoes";
import { PublicarToggle } from "./publicar-toggle";
import { ExibirNaHomeToggle } from "./exibir-na-home-toggle";
import { ExcluirServicoBotao } from "./excluir-servico-botao";

type ServicoLista = {
  id: string;
  slug: string;
  titulo: string;
  cover_image_url: string;
  cover_image_alt: string;
  publicado: boolean;
  exibir_na_home: boolean;
};

// A linha inteira navega pra edição — mas tem botões de verdade dentro
// (reordenar, publicar, destacar na home, excluir), e HTML não permite
// elemento interativo dentro de <a>. Então em vez de um Link envolvendo
// tudo, a linha é uma div com onClick + role="link", e o cluster de ações
// para a propagação do clique antes que ele chegue na linha.
export function ServicoLinha({
  servico,
  podeSubir,
  podeDescer,
}: {
  servico: ServicoLista;
  podeSubir: boolean;
  podeDescer: boolean;
}) {
  const router = useRouter();
  const href = `/painel/servicos/${servico.id}/editar`;

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
        <Image
          src={servico.cover_image_url}
          alt={servico.cover_image_alt}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-neutral-900">{servico.titulo}</span>
          <Badge variant={servico.publicado ? "default" : "secondary"}>
            {servico.publicado ? "Publicado" : "Rascunho"}
          </Badge>
          {servico.exibir_na_home && <Badge variant="outline">Na home</Badge>}
        </div>
        <p className="truncate text-sm text-neutral-500">/servicos/{servico.slug}</p>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-2">
        <MoverOrdemBotoes id={servico.id} podeSubir={podeSubir} podeDescer={podeDescer} />
        <ExibirNaHomeToggle id={servico.id} exibirNaHome={servico.exibir_na_home} />
        <PublicarToggle id={servico.id} publicado={servico.publicado} />
        <ExcluirServicoBotao id={servico.id} titulo={servico.titulo} />
      </div>
    </div>
  );
}
