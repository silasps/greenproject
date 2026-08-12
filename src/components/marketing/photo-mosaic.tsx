import Image from "next/image";
import Link from "next/link";
import type { MosaicImage } from "@/lib/content/servicos";
import { ScrollReveal } from "./scroll-reveal";

const mosaicClasses = [
  "col-span-2 sm:col-span-3 sm:row-span-2",
  "col-span-1 sm:col-span-3",
  "col-span-1 sm:col-span-1",
  "col-span-1 sm:col-span-1",
  "col-span-1 sm:col-span-1",
];

export function PhotoMosaic({ images }: { images: MosaicImage[] }) {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="max-w-xl text-2xl font-bold text-neutral-900">
          Fotos reais dos ensaios que já realizamos
        </h2>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Sem banco de imagens: cada foto é de um serviço executado em campo pela nossa
          equipe.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-6 sm:grid-rows-[150px_150px] sm:gap-3 lg:grid-rows-[180px_180px]">
          {images.slice(0, 5).map((image, index) => (
            <ScrollReveal key={image.src} index={index} className={mosaicClasses[index]}>
              <Link
                href={`/servicos/${image.servicoSlug}`}
                className="group relative block aspect-square h-full w-full overflow-hidden rounded-md bg-neutral-100 sm:aspect-auto"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes={
                    index === 0
                      ? "(max-width: 640px) 100vw, 50vw"
                      : "(max-width: 640px) 50vw, 25vw"
                  }
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute top-2.5 left-2.5 rounded-sm bg-neutral-950/70 px-2 py-1 font-mono text-[10px] font-medium tracking-widest text-white uppercase backdrop-blur-sm"
                >
                  Reg. {String(index + 1).padStart(2, "0")}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/25 to-transparent p-3 pt-8 opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                  <span className="block text-xs font-semibold text-white sm:text-sm">
                    {image.label}
                  </span>
                </span>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
