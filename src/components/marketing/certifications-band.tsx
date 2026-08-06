const NORMAS = ["INMETRO", "CONTRAN", "CONAMA", "IBAMA", "NR-12", "NR-18"];

export function CertificationsBand() {
  return (
    <div className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center font-mono text-[11px] font-medium tracking-widest text-neutral-500 uppercase">
          Ensaios e laudos conduzidos conforme
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {NORMAS.map((norma) => (
            <span
              key={norma}
              className="rounded-sm border border-neutral-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold tracking-wide text-neutral-700"
            >
              {norma}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
