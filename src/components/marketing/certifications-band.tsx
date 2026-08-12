import { BadgeCheck } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const NORMAS = ["INMETRO", "CONTRAN", "CONAMA", "IBAMA", "NR-12", "NR-18"];

export function CertificationsBand() {
  return (
    <div className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center font-mono text-[11px] font-medium tracking-widest text-neutral-500 uppercase">
          Ensaios e laudos conduzidos conforme
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {NORMAS.map((norma, index) => (
            <ScrollReveal key={norma} index={index}>
              <span className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md">
                <BadgeCheck className="h-4 w-4 text-neutral-500" aria-hidden />
                <span className="font-mono text-xs font-semibold tracking-wide text-neutral-700">
                  {norma}
                </span>
              </span>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
