"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, X, Info, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropInput } from "@/components/file-drop-input";
import { cn } from "@/lib/utils";
import {
  EspecificacaoMotorFields,
  type EspecificacaoMotorValues,
} from "../../clientes/[id]/veiculos/especificacao-motor-fields";
import { salvarCampo, salvarEspecificacaoMotorDoTeste, marcarEspecificacaoMotorViaDispositivo } from "../actions";

type Equipamento = { id: string; label: string };

type EspecificacaoMotorDb = {
  marcha_lenta_min: number | null;
  marcha_lenta_max: number | null;
  rotacao_corte_min: number | null;
  rotacao_corte_max: number | null;
  limite_opacidade: number | null;
};

type VeiculoParaMotor = {
  id: string;
  marca: string;
  identificacaoMotor: string | null;
  especificacao: EspecificacaoMotorDb | null;
} | null;

// Ordem em que o técnico fotografa em campo. A dupla foto de etiqueta
// (completa + número em destaque) existe pra reduzir erro humano: o número
// ainda é digitado à mão na conferência final, mas agora fica uma foto
// zoomada só do número, pra conferir depois se bateu.
const STEPS = [
  {
    name: "foto_frente",
    titulo: "Frente do veículo",
    descricao: "Enquadre o veículo de frente, com a placa bem visível e legível.",
    exemplo: "/exemplos-campo/frente.webp",
  },
  {
    name: "foto_traseira",
    titulo: "Teste sendo realizado",
    descricao: "Fotografe o opacímetro encaixado no escapamento, durante a aceleração do motor.",
    exemplo: "/exemplos-campo/traseira.webp",
  },
  {
    name: "foto_painel",
    titulo: "Painel / odômetro",
    descricao: "Fotografe o painel com o odômetro (hodômetro) legível.",
    exemplo: "/exemplos-campo/painel.webp",
  },
  {
    name: "foto_etiqueta",
    titulo: "Etiqueta do resultado — completa",
    descricao: "Fotografe a etiqueta impressa pelo opacímetro inteira, sem cortar as bordas.",
    exemplo: "/exemplos-campo/etiqueta.webp",
  },
  {
    name: "foto_etiqueta_numero",
    titulo: "Etiqueta — número em destaque",
    descricao: "Aproxime bem e fotografe só a área do número do teste — essa foto serve de conferência do que for digitado.",
    exemplo: "/exemplos-campo/etiqueta-numero.webp",
  },
] as const;

/** Fotos extras opcionais — só aparecem na conferência final, não são uma etapa do fluxo. */
function FotosExtras() {
  const [slots, setSlots] = useState<number[]>([]);
  const [proximoId, setProximoId] = useState(0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">Fotos extras (opcional)</p>
        <button
          type="button"
          onClick={() => {
            setSlots((s) => [...s, proximoId]);
            setProximoId((n) => n + 1);
          }}
          className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus className="size-3.5" />
          Adicionar foto
        </button>
      </div>
      {slots.map((id) => (
        <div key={id} className="flex items-start gap-2">
          <div className="flex-1">
            <FileDropInput id={`foto_extra_${id}`} name={`foto_extra_${id}`} accept="image/*" capture="environment" />
          </div>
          <button
            type="button"
            onClick={() => setSlots((s) => s.filter((x) => x !== id))}
            aria-label="Remover"
            className="mt-1 shrink-0 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

const VALORES_MOTOR_VAZIOS: EspecificacaoMotorValues = {
  identificacaoMotor: "",
  marchaLentaMin: "",
  marchaLentaMax: "",
  rotacaoCorteMin: "",
  rotacaoCorteMax: "",
  limiteOpacidade: "",
};

/**
 * Card de "especificação do motor" na fase "preparo" — três desfechos
 * possíveis: já cadastrada (nada a fazer), declarada como "vem do PDF do
 * dispositivo" (promessa, conferida depois na importação/`liberarLaudo`),
 * ou pendente (cadastra ali mesmo ou declara a promessa). Sem ela,
 * "Concluir campo" fica bloqueado — ver `bloqueadoPorMotor` no componente pai.
 */
function CardEspecificacaoMotor({
  testeId,
  veiculo,
  especificacaoViaDispositivo,
}: {
  testeId: string;
  veiculo: VeiculoParaMotor;
  especificacaoViaDispositivo: boolean;
}) {
  const router = useRouter();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [valores, setValores] = useState<EspecificacaoMotorValues>(
    veiculo?.especificacao
      ? {
          identificacaoMotor: veiculo.identificacaoMotor ?? "",
          marchaLentaMin: veiculo.especificacao.marcha_lenta_min?.toString() ?? "",
          marchaLentaMax: veiculo.especificacao.marcha_lenta_max?.toString() ?? "",
          rotacaoCorteMin: veiculo.especificacao.rotacao_corte_min?.toString() ?? "",
          rotacaoCorteMax: veiculo.especificacao.rotacao_corte_max?.toString() ?? "",
          limiteOpacidade: veiculo.especificacao.limite_opacidade?.toString() ?? "",
        }
      : { ...VALORES_MOTOR_VAZIOS, identificacaoMotor: veiculo?.identificacaoMotor ?? "" },
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(patch: Partial<EspecificacaoMotorValues>) {
    setValores((v) => ({ ...v, ...patch }));
  }

  function handleSalvar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      try {
        await salvarEspecificacaoMotorDoTeste(testeId, veiculo!.id, formData);
        setMostrarForm(false);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  function handleViaDispositivo() {
    setErro(null);
    startTransition(async () => {
      try {
        await marcarEspecificacaoMotorViaDispositivo(testeId);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  if (!veiculo) return null;

  if (mostrarForm) {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-left">
        <p className="text-sm font-semibold text-neutral-800">Especificação do motor</p>
        <form action={handleSalvar} className="space-y-3">
          <EspecificacaoMotorFields marca={veiculo.marca} values={valores} onChange={handleChange} idPrefix="campo-" />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
              {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar especificação"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setMostrarForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (veiculo.especificacao) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4 text-left">
        <p className="text-sm text-brand-dark">
          ✓ Especificação do motor cadastrada{veiculo.identificacaoMotor ? ` (${veiculo.identificacaoMotor})` : ""}
        </p>
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Pencil className="size-3.5" />
          Editar
        </button>
      </div>
    );
  }

  if (especificacaoViaDispositivo) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left">
        <p className="text-sm text-neutral-600">Aguardando os limites do PDF do opacímetro (declarado como já configurado no dispositivo).</p>
        <button
          type="button"
          onClick={() => setMostrarForm(true)}
          className="shrink-0 text-xs font-medium text-brand hover:underline"
        >
          Cadastrar aqui mesmo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
      <p className="text-sm text-amber-800">Especificação do motor pendente — sem ela não dá pra concluir o campo.</p>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setMostrarForm(true)} className="bg-brand hover:bg-brand-dark">
          Cadastrar especificação do motor
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={handleViaDispositivo}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Já configurei no aparelho/app do Syscon"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Fluxo de campo em tela cheia, um passo por vez — pensado pra diminuir
 * erro humano no celular (menos coisa na tela ao mesmo tempo). Os 5
 * `FileDropInput` de foto ficam todos montados o tempo todo (só
 * escondidos via CSS fora do passo atual), pra manter o arquivo já
 * escolhido em cada um sem precisar duplicar o estado aqui em cima — na
 * conferência final todos aparecem juntos, já com as fotos preenchidas.
 */
export function CampoWizard({
  testeId,
  equipamentos,
  veiculo,
  especificacaoViaDispositivo,
}: {
  testeId: string;
  equipamentos: Equipamento[];
  veiculo: VeiculoParaMotor;
  especificacaoViaDispositivo: boolean;
}) {
  const router = useRouter();
  const [fase, setFase] = useState<number | "preparo" | "conferencia">("preparo");
  const [equipamentoId, setEquipamentoId] = useState("");
  const [prontos, setProntos] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await salvarCampo(testeId, formData);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  const total = STEPS.length;
  const passoAtual = typeof fase === "number" ? fase : fase === "conferencia" ? total : -1;
  const concluidas = STEPS.filter((s) => prontos[s.name]).length;
  const motorResolvido = !!veiculo?.especificacao || especificacaoViaDispositivo;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {fase !== "preparo" && (
        <div className="shrink-0 border-b border-neutral-200 px-4 py-3">
          <div className="mx-auto flex max-w-md items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              {fase === "conferencia" ? "Conferência final" : `Passo ${passoAtual + 1} de ${total}`}
            </p>
            {fase !== "conferencia" && (
              <p className="text-xs font-bold text-brand">{Math.round(((passoAtual + 1) / total) * 100)}%</p>
            )}
          </div>
          <div className="mx-auto mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${((fase === "conferencia" ? total : passoAtual + 1) / total) * 100}%` }}
            />
          </div>
          {fase !== "conferencia" && (
            <p className="mx-auto mt-1.5 max-w-md text-center text-xs text-neutral-400">
              Faltam {total - concluidas} de {total} fotos
            </p>
          )}
        </div>
      )}

      {fase === "preparo" ? (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex min-h-[65vh] max-w-md flex-col justify-center space-y-6 text-center">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">Execução do teste</h1>
              <p className="mt-1 text-sm text-neutral-500">Escolha o opacímetro usado pra começar o passo a passo.</p>
            </div>
            <div className="space-y-2 text-left">
              <Label>Equipamento usado neste teste</Label>
              <Select
                value={equipamentoId}
                onValueChange={(v) => v && setEquipamentoId(v)}
                items={Object.fromEntries(equipamentos.map((eq) => [eq.id, eq.label]))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o opacímetro" />
                </SelectTrigger>
                <SelectContent>
                  {equipamentos.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CardEspecificacaoMotor testeId={testeId} veiculo={veiculo} especificacaoViaDispositivo={especificacaoViaDispositivo} />

            <Button
              type="button"
              disabled={!equipamentoId}
              className="h-12 rounded-full bg-brand text-base hover:bg-brand-dark"
              onClick={() => setFase(0)}
            >
              Começar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <form action={handleSubmit} className="mx-auto max-w-md space-y-4">
            {STEPS.map((step, i) => (
              <div key={step.name} className={cn(fase === i || fase === "conferencia" ? "block" : "hidden")}>
                {fase !== "conferencia" && (
                  <>
                    <h2 className="mb-1 text-xl font-bold text-neutral-900">{step.titulo}</h2>
                    <p className="mb-4 text-sm text-neutral-500">{step.descricao}</p>
                    <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm">
                      <Image src={step.exemplo} alt={`Exemplo: ${step.titulo}`} fill sizes="450px" className="object-contain" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/50 to-transparent p-3">
                        <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          <Info className="size-3.5" />
                          Exemplo de captura
                        </span>
                      </div>
                    </div>
                  </>
                )}
                <Label htmlFor={step.name} className={fase === "conferencia" ? "text-sm font-medium text-neutral-900" : "sr-only"}>
                  {step.titulo}
                </Label>
                <div className={fase === "conferencia" ? "mt-2" : ""}>
                  <FileDropInput
                    id={step.name}
                    name={step.name}
                    accept="image/*"
                    capture="environment"
                    required
                    onArquivoChange={(f) => setProntos((p) => ({ ...p, [step.name]: !!f }))}
                  />
                </div>
              </div>
            ))}

            {fase === "conferencia" && (
              <div className="space-y-4">
                <div>
                  <h1 className="text-lg font-bold text-neutral-900">Conferência final</h1>
                  <p className="text-sm text-neutral-500">Confira as fotos e digite o número do teste antes de concluir.</p>
                </div>
                <input type="hidden" name="equipamento_id" value={equipamentoId} />
                <div className="space-y-2">
                  <Label htmlFor="numero_teste">Número do teste (impresso na etiqueta)</Label>
                  <Input id="numero_teste" name="numero_teste" required />
                </div>
                <FotosExtras />

                {!motorResolvido && (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-700">
                      Falta resolver a especificação do motor antes de concluir — volta na primeira tela pra cadastrar
                      ou declarar que já está no dispositivo.
                    </p>
                    <CardEspecificacaoMotor
                      testeId={testeId}
                      veiculo={veiculo}
                      especificacaoViaDispositivo={especificacaoViaDispositivo}
                    />
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="sticky bottom-0 -mx-4 mt-2 flex gap-2 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              {typeof fase === "number" && fase > 0 && (
                <Button type="button" variant="outline" className="h-12 rounded-full text-base" onClick={() => setFase(fase - 1)}>
                  Voltar
                </Button>
              )}
              {typeof fase === "number" && fase < total - 1 && (
                <Button
                  type="button"
                  disabled={!prontos[STEPS[fase].name]}
                  className="h-12 flex-1 rounded-full bg-brand text-base hover:bg-brand-dark"
                  onClick={() => setFase(fase + 1)}
                >
                  Próxima etapa
                </Button>
              )}
              {typeof fase === "number" && fase === total - 1 && (
                <Button
                  type="button"
                  disabled={!prontos[STEPS[fase].name]}
                  className="h-12 flex-1 rounded-full bg-brand text-base hover:bg-brand-dark"
                  onClick={() => setFase("conferencia")}
                >
                  Ir pra conferência
                </Button>
              )}
              {fase === "conferencia" && (
                <>
                  <Button type="button" variant="outline" className="h-12 rounded-full text-base" onClick={() => setFase(total - 1)}>
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={pending || !motorResolvido}
                    className="h-12 flex-1 rounded-full bg-brand text-base hover:bg-brand-dark"
                  >
                    {pending ? "Enviando..." : "Concluir campo"}
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
