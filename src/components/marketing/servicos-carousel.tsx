"use client";

import { useState, useSyncExternalStore } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ServicoCard } from "./servico-card";
import type { Servico } from "@/lib/content/servicos";

// Mesmos breakpoints das classes de largura do card mais abaixo
// (basis-full / sm:basis-1/2 / lg:basis-1/3) — precisam ficar em sincronia:
// é assim que sabemos quantos cards cabem na tela pra decidir se o
// autoplay deve rodar. Funções de módulo (não recriadas a cada render) —
// mesmo padrão do relógio em painel/sidebar.tsx.
function getSnapshotServidor() {
  return false;
}

function criarMatchMediaStore(query: string) {
  function inscrever(callback: () => void) {
    const mediaQuery = window.matchMedia(query);
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
  }
  function getSnapshot() {
    return window.matchMedia(query).matches;
  }
  return { inscrever, getSnapshot };
}

const smStore = criarMatchMediaStore("(min-width: 640px)");
const lgStore = criarMatchMediaStore("(min-width: 1024px)");

function Setas({
  className,
  emblaApi,
}: {
  className: string;
  emblaApi: UseEmblaCarouselType[1];
}) {
  return (
    <div className={className}>
      <button
        type="button"
        aria-label="Serviço anterior"
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute top-1/2 left-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-colors hover:border-brand/40 hover:text-brand"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Próximo serviço"
        onClick={() => emblaApi?.scrollNext()}
        className="absolute top-1/2 right-2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-colors hover:border-brand/40 hover:text-brand"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

// Carrossel com loop infinito (embla cuida do wraparound, não
// reimplementamos esse cálculo na mão). Autoplay e as setas ficam ativos
// juntos, sempre que existir card escondido na tela atual — 1 card por vez
// (mobile), 2 (tablet) ou 3+ (desktop). As setas são decididas em CSS puro
// (3 variantes por breakpoint, cada uma só depende de `servicos.length` —
// nada de detecção de viewport em JS ali) pra não piscar durante a
// hidratação; só o autoplay depende de saber o breakpoint em JS, e um
// atraso de um frame ali não é perceptível.
export function ServicosCarousel({ servicos }: { servicos: Servico[] }) {
  const isSm = useSyncExternalStore(smStore.inscrever, smStore.getSnapshot, getSnapshotServidor);
  const isLg = useSyncExternalStore(lgStore.inscrever, lgStore.getSnapshot, getSnapshotServidor);
  const slidesPorTela = isLg ? 3 : isSm ? 2 : 1;
  const temCardEscondido = servicos.length > slidesPorTela;

  const [autoplayPlugin] = useState(() => Autoplay({ delay: 5000, stopOnInteraction: false }));

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", duration: 35 },
    temCardEscondido ? [autoplayPlugin] : []
  );

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef} aria-roledescription="carrossel">
        <div className="-ml-5 flex">
          {servicos.map((servico) => (
            <div
              key={servico.slug}
              className="min-w-0 shrink-0 grow-0 basis-full pl-5 sm:basis-1/2 lg:basis-1/3"
            >
              <ServicoCard servico={servico} />
            </div>
          ))}
        </div>
      </div>

      {/* Fixo no container, não dentro do card — fica parado no lugar
          enquanto os cards passam por baixo, em vez de rolar junto com o
          primeiro slide. */}
      {servicos.length > 0 && (
        <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-sm bg-brand px-2 py-1 font-mono text-[10px] font-semibold tracking-widest text-white uppercase">
          Serviço em destaque
        </span>
      )}

      {servicos.length > 1 && <Setas className="sm:hidden" emblaApi={emblaApi} />}
      {servicos.length > 2 && <Setas className="hidden sm:block lg:hidden" emblaApi={emblaApi} />}
      {servicos.length > 3 && <Setas className="hidden lg:block" emblaApi={emblaApi} />}
    </div>
  );
}
