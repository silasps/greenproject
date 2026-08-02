"use client";

import { useMemo, useState } from "react";
import { Users, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Pessoa = { id: string; nome: string };

/** Seletor de participantes internos (equipe) pra um evento — sem texto livre. */
export function AttendeePicker({
  pessoas,
  name = "participantes",
  selecionadosIniciais = [],
}: {
  pessoas: Pessoa[];
  name?: string;
  selecionadosIniciais?: string[];
}) {
  const [selecionados, setSelecionados] = useState<string[]>(selecionadosIniciais);
  const [busca, setBusca] = useState("");

  const pessoasPorId = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas]);
  const filtradas = useMemo(
    () => pessoas.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())),
    [pessoas, busca],
  );

  function alternar(id: string) {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));
  }

  return (
    <div className="space-y-2">
      {selecionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selecionados.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {pessoasPorId.get(id)?.nome ?? id}
              <input type="hidden" name={name} value={id} />
              <button
                type="button"
                onClick={() => alternar(id)}
                aria-label={`Remover ${pessoasPorId.get(id)?.nome ?? ""}`}
                className="rounded-full hover:bg-black/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="sm">
              <Users className="size-3.5" />
              Marcar pessoas
            </Button>
          }
        />
        <PopoverContent align="start">
          <Input
            placeholder="Buscar na equipe..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {filtradas.length === 0 && <p className="p-2 text-sm text-neutral-500">Ninguém encontrado.</p>}
            {filtradas.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100"
              >
                <Checkbox checked={selecionados.includes(p.id)} onCheckedChange={() => alternar(p.id)} />
                {p.nome}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
