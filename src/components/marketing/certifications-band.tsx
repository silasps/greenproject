const NORMAS = ["INMETRO", "CONTRAN", "CONAMA", "IBAMA", "NR-12", "NR-18"];

export function CertificationsBand() {
  return (
    <div className="border-y border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="text-center text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Ensaios e laudos conduzidos conforme
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {NORMAS.map((norma) => (
            <span key={norma} className="text-sm font-semibold text-neutral-700">
              {norma}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
