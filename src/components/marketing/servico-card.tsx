import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Servico } from "@/lib/content/servicos";

export function ServicoCard({
  servico,
  className,
  preloadImage = false,
  destaque = false,
}: {
  servico: Servico;
  className?: string;
  preloadImage?: boolean;
  destaque?: boolean;
}) {
  return (
    <Card
      className={cn(
        "h-full gap-0 rounded-md border border-neutral-200 py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md",
        className
      )}
    >
      <Link
        href={`/servicos/${servico.slug}`}
        aria-label={`Ver detalhes de ${servico.titulo}`}
        className="relative block aspect-[4/3] overflow-hidden bg-neutral-100"
      >
        <Image
          src={servico.coverImage.src}
          alt={servico.coverImage.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          preload={preloadImage}
          className="object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
        {destaque && (
          <span className="absolute top-3 left-3 rounded-sm bg-brand px-2 py-1 font-mono text-[10px] font-semibold tracking-widest text-white uppercase">
            Serviço em destaque
          </span>
        )}
      </Link>
      <CardHeader className="px-5 pt-5 pb-4">
        {servico.normas && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {servico.normas.map((norma) => (
              <span
                key={norma}
                className="rounded-sm bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-brand-dark"
              >
                {norma}
              </span>
            ))}
          </div>
        )}
        <CardTitle className="text-lg font-semibold text-neutral-900">
          {servico.titulo}
        </CardTitle>
        <CardDescription className="mt-2 leading-6 text-neutral-600">
          {servico.resumo}
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto justify-between rounded-b-md border-t border-neutral-200 bg-neutral-50 px-5 py-4">
        <Link
          href={`/servicos/${servico.slug}`}
          className="group/link inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark"
        >
          Saiba mais
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </CardFooter>
    </Card>
  );
}
