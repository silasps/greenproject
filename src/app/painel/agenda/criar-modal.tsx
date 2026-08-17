"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dialog, DialogPortal, DialogOverlay, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  clienteIdPreSelecionado,
  veiculoIdPreSelecionado,
  apenasTeste,
  onSucesso,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podeCriarTeste: boolean;
  dataInicial?: string;
  horaInicial?: string;
  clienteIdPreSelecionado?: string;
  veiculoIdPreSelecionado?: string;
  apenasTeste?: boolean;
  onSucesso?: () => void;
}) {
  // Equipe/configurações só são necessárias dentro do form — buscar aqui,
  // sob demanda, na primeira vez que o modal abre (e cachear em memória)
  // evita rodar essas consultas em toda navegação da agenda.
  const [dados, setDados] = useState<Dados | null>(null);
  // Alvo do portal do rodapé (botões Criar/Cancelar) — fica fora da área
  // rolável pra ficar sempre alcançável, sem precisar rolar o form inteiro.
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  // Alvo do portal do toggle Evento/Teste — fica junto do header, fixo, em
  // vez de rolar com o resto do form.
  const [toggleEl, setToggleEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || dados) return;
    const supabase = createClient();
    Promise.all([
      // Contas superadmin (dono/desenvolvedor, só manutenção do sistema) não
      // são equipe pra atribuir evento — mesmo critério do módulo DP.
      supabase.from("usuarios_perfis").select("id, nome").eq("is_superadmin", false).order("nome"),
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
      <DialogPortal>
        <DialogOverlay />
        {/* Bottom sheet no mobile (ancorado embaixo, sem centralização por
            translate — a fonte dos bugs de "pulo" no teclado), card
            centralizado normal a partir de sm. */}
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <DialogPrimitive.Popup
            data-slot="dialog-content"
            className="relative flex max-h-[92dvh] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-t-3xl bg-popover text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/10 duration-150 outline-none data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom sm:max-h-[85dvh] sm:rounded-xl sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-open:slide-in-from-bottom-0 sm:data-closed:fade-out-0 sm:data-closed:zoom-out-95 sm:data-closed:slide-out-to-bottom-0"
          >
            {/* Alça de arrastar — só mobile, indica que é um bottom sheet */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1 sm:hidden">
              <div className="h-1.5 w-10 rounded-full bg-neutral-200" />
            </div>

            {/* Header fixo */}
            <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
              <h2 className="font-heading text-base font-medium text-popover-foreground">Criar</h2>
              <DialogClose render={<Button variant="ghost" size="icon-sm" />}>
                <XIcon />
                <span className="sr-only">Fechar</span>
              </DialogClose>
            </div>

            {/* Toggle Evento/Teste — fixo junto do header, preenchido via portal pelo EventoForm */}
            <div ref={setToggleEl} className="shrink-0 border-b border-neutral-100" />

            {/* Meio rolável — só isso rola, header e rodapé ficam fixos */}
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {open && dados && (
                <EventoForm
                  podeCriarTeste={podeCriarTeste}
                  equipe={dados.equipe}
                  configuracoesOrcamento={dados.configuracoesOrcamento}
                  tiposServico={dados.tiposServico}
                  dataInicial={dataInicial}
                  horaInicial={horaInicial}
                  clienteIdPreSelecionado={clienteIdPreSelecionado}
                  veiculoIdPreSelecionado={veiculoIdPreSelecionado}
                  apenasTeste={apenasTeste}
                  onCancelar={() => onOpenChange(false)}
                  onSucesso={onSucesso}
                  footerContainer={footerEl}
                  toggleContainer={toggleEl}
                />
              )}
              {open && !dados && <p className="py-8 text-center text-sm text-neutral-500">Carregando...</p>}
            </div>

            {/* Rodapé fixo — preenchido via portal pelos botões do EventoForm */}
            <div ref={setFooterEl} className="flex shrink-0 gap-3 border-t border-neutral-100 bg-neutral-50 px-4 py-3 sm:px-6" />
          </DialogPrimitive.Popup>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
