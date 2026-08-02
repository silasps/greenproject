"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { EventoForm } from "./evento-form";

type Pessoa = { id: string; nome: string };
type ConfiguracoesOrcamento = { valor_km: number; fator_correcao_distancia: number };
type TipoServico = { id: string; nome: string; valor: number };

type Dados = {
  equipe: Pessoa[];
  configuracoesOrcamento: ConfiguracoesOrcamento;
  tiposServico: TipoServico[];
};

export function CriarModal({
  open,
  onOpenChange,
  podeCriarTeste,
  dataInicial,
  horaInicial,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeCriarTeste: boolean;
  dataInicial?: string;
  horaInicial?: string;
  onSucesso?: () => void;
}) {
  // Equipe/configurações só são necessárias dentro do form — buscar aqui,
  // sob demanda, na primeira vez que o modal abre (e cachear em memória)
  // evita rodar essas consultas em toda navegação da agenda.
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    if (!open || dados) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("usuarios_perfis").select("id, nome").order("nome"),
      podeCriarTeste
        ? supabase.from("configuracoes_orcamento").select("valor_km, fator_correcao_distancia").single()
        : Promise.resolve({ data: null }),
      podeCriarTeste
        ? supabase.from("tipos_servico").select("id, nome, valor").eq("ativo", true).order("nome")
        : Promise.resolve({ data: null }),
    ]).then(([{ data: equipe }, { data: configuracoes }, { data: tiposServico }]) => {
      setDados({
        equipe: (equipe ?? []).map((u) => ({ id: u.id, nome: u.nome })),
        configuracoesOrcamento: configuracoes ?? { valor_km: 0, fator_correcao_distancia: 1.4 },
        tiposServico: tiposServico ?? [],
      });
    });
  }, [open, dados, podeCriarTeste]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar</DialogTitle>
        </DialogHeader>
        {open && dados && (
          <EventoForm
            podeCriarTeste={podeCriarTeste}
            equipe={dados.equipe}
            configuracoesOrcamento={dados.configuracoesOrcamento}
            tiposServico={dados.tiposServico}
            dataInicial={dataInicial}
            horaInicial={horaInicial}
            onCancelar={() => onOpenChange(false)}
            onSucesso={onSucesso}
          />
        )}
        {open && !dados && <p className="py-8 text-center text-sm text-neutral-500">Carregando...</p>}
      </DialogContent>
    </Dialog>
  );
}
