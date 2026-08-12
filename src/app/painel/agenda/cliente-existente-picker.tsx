"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { formatCpfCnpj } from "@/lib/utils/documento";

type Cliente = { id: string; nome: string; cnpj_cpf: string | null; matchedPlaca?: string };
type Veiculo = { id: string; identificador: string; marca: string | null; modelo: string | null };

/** Acima disso a lista de veículos do cliente ganha um filtro — abaixo, mostrar tudo direto já é rápido de escanear. */
const LIMIAR_FILTRO_VEICULOS = 6;

/**
 * Busca um cliente já cadastrado (nome ou CNPJ/CPF) e, depois de escolhido,
 * deixa reusar um veículo existente dele (reteste) ou avisar que é um
 * veículo novo — nesse caso o cadastro do veículo continua no form (fora
 * daqui), só o cliente deixa de ser criado de novo.
 */
export function ClienteExistentePicker({
  clienteIdInicial,
  veiculoIdInicial,
  onVeiculoNovo,
}: {
  clienteIdInicial?: string;
  veiculoIdInicial?: string;
  /** Avisa o form pai se a pessoa optou por "veículo novo" pra esse cliente (mostra os campos de cadastro do veículo). */
  onVeiculoNovo?: (novo: boolean) => void;
}) {
  const [busca, setBusca] = useState("");
  const [resultadosBrutos, setResultadosBrutos] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[] | null>(null);
  const [veiculoId, setVeiculoId] = useState<string | null>(veiculoIdInicial ?? null);
  const [veiculoNovo, setVeiculoNovo] = useState(false);
  const [filtroVeiculo, setFiltroVeiculo] = useState("");

  // Pré-seleção vinda do botão "Retestar" (deep link com só o id) — busca os dados uma vez.
  useEffect(() => {
    if (!clienteIdInicial) return;
    const supabase = createClient();
    supabase
      .from("clientes")
      .select("id, nome, cnpj_cpf")
      .eq("id", clienteIdInicial)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setCliente(data);
        setFiltroVeiculo("");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const termoLimpo = busca.trim();
  // Deriva do termo atual em vez de "limpar" via setState no efeito.
  const resultados = termoLimpo.length < 2 || cliente ? [] : resultadosBrutos;

  useEffect(() => {
    if (termoLimpo.length < 2 || cliente) return;
    const supabase = createClient();
    const digitos = termoLimpo.replace(/\D/g, "");
    const timeout = setTimeout(() => {
      // Busca por nome/CNPJ/CPF do cliente e por placa de veículo em paralelo
      // (é busca de cliente, mas achar pela placa é mais rápido pra quem já
      // tem o veículo na mão) — depois junta os dois resultados num só.
      Promise.all([
        supabase
          .from("clientes")
          .select("id, nome, cnpj_cpf")
          .or(digitos ? `nome.ilike.%${termoLimpo}%,cnpj_cpf.ilike.%${digitos}%` : `nome.ilike.%${termoLimpo}%`)
          .order("nome")
          .limit(8),
        supabase
          .from("veiculos_maquinas")
          .select("identificador, clientes(id, nome, cnpj_cpf)")
          .ilike("identificador", `%${termoLimpo}%`)
          .limit(8),
      ]).then(([porDados, porPlaca]) => {
        const porId = new Map<string, Cliente>();
        for (const c of porDados.data ?? []) porId.set(c.id, c);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const v of (porPlaca.data ?? []) as any[]) {
          const c = v.clientes;
          if (!c || porId.has(c.id)) continue;
          porId.set(c.id, { ...c, matchedPlaca: v.identificador });
        }
        setResultadosBrutos(Array.from(porId.values()).slice(0, 8));
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [termoLimpo, cliente]);

  useEffect(() => {
    if (!cliente) return;
    const supabase = createClient();
    supabase
      .from("veiculos_maquinas")
      .select("id, identificador, marca, modelo")
      .eq("cliente_id", cliente.id)
      .order("identificador")
      .then(({ data }) => setVeiculos(data ?? []));
  }, [cliente]);

  const filtroVeiculoLimpo = filtroVeiculo.trim().toLowerCase();
  const veiculosFiltrados = !filtroVeiculoLimpo
    ? veiculos
    : (veiculos ?? []).filter((v) =>
        [v.identificador, v.marca, v.modelo].filter(Boolean).join(" ").toLowerCase().includes(filtroVeiculoLimpo),
      );

  function escolherVeiculo(id: string) {
    setVeiculoId(id);
    setVeiculoNovo(false);
    onVeiculoNovo?.(false);
  }

  function escolherVeiculoNovo() {
    setVeiculoId(null);
    setVeiculoNovo(true);
    onVeiculoNovo?.(true);
  }

  function limpar() {
    setCliente(null);
    setVeiculoId(null);
    setVeiculoNovo(false);
    setBusca("");
    onVeiculoNovo?.(false);
  }

  if (!cliente) {
    return (
      <div className="space-y-2">
        <Input placeholder="Buscar por nome, CNPJ/CPF ou placa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        {resultados.length > 0 && (
          <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
            {resultados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCliente(c);
                  setFiltroVeiculo("");
                }}
                className="flex w-full items-center justify-between p-2 text-left text-sm hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{c.nome}</span>
                <span className="text-xs text-neutral-400">
                  {c.matchedPlaca ? `Placa ${c.matchedPlaca}` : c.cnpj_cpf ? formatCpfCnpj(c.cnpj_cpf) : "Cadastro pendente"}
                </span>
              </button>
            ))}
          </div>
        )}
        {termoLimpo.length >= 2 && resultados.length === 0 && (
          <p className="text-xs text-neutral-400">Nenhum cliente encontrado com esse termo.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-neutral-200 bg-white p-3">
      <input type="hidden" name="cliente_id_existente" value={cliente.id} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-neutral-900">{cliente.nome}</p>
          <p className="text-xs text-neutral-400">{cliente.cnpj_cpf ? formatCpfCnpj(cliente.cnpj_cpf) : "Cadastro pendente"}</p>
        </div>
        <button type="button" onClick={limpar} className="text-xs text-neutral-400 hover:underline">
          Trocar
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Veículo/equipamento{veiculos && veiculos.length > 0 ? ` (${veiculos.length})` : ""}
        </p>
        {veiculos === null && <p className="text-xs text-neutral-400">Carregando veículos...</p>}

        {veiculos && veiculos.length > LIMIAR_FILTRO_VEICULOS && (
          <Input
            placeholder="Filtrar por placa, marca ou modelo..."
            value={filtroVeiculo}
            onChange={(e) => setFiltroVeiculo(e.target.value)}
            className="mb-1"
          />
        )}

        {veiculos && veiculos.length > 0 && (
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {veiculosFiltrados?.map((v) => (
              <label
                key={v.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 p-2 text-sm hover:bg-neutral-50"
              >
                <input type="radio" checked={veiculoId === v.id} onChange={() => escolherVeiculo(v.id)} />
                <span className="font-medium text-neutral-900">{v.identificador}</span>
                <span className="text-neutral-400">{[v.marca, v.modelo].filter(Boolean).join(" ")}</span>
              </label>
            ))}
            {veiculosFiltrados?.length === 0 && (
              <p className="p-2 text-xs text-neutral-400">Nenhum veículo encontrado com esse termo.</p>
            )}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 p-2 text-sm hover:bg-neutral-50">
          <input type="radio" checked={veiculoNovo} onChange={escolherVeiculoNovo} />
          Veículo/equipamento novo pra esse cliente
        </label>
        {veiculoId && <input type="hidden" name="veiculo_id_existente" value={veiculoId} />}
      </div>
    </div>
  );
}
