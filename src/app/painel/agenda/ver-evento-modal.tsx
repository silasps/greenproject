"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pencil,
  Trash2,
  Users,
  Wrench,
  Loader2,
  Clock,
  Palette,
  AlignLeft,
  User,
  MapPin,
  Calculator,
  MessageCircle,
  Mail,
  Car,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendeePicker } from "@/components/attendee-picker";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ErrorModal } from "@/components/error-modal";
import { MoedaInput } from "@/components/moeda-input";
import { createClient } from "@/lib/supabase/client";
import { formatTelefone, formatTelefoneFixo, formatCep, onlyDigits } from "@/lib/utils/mascaras";
import { buscarEnderecoPorCep } from "@/lib/geo/cep";
import { COORDENADAS_EMPRESA, haversineKm, type Coordenada } from "@/lib/geo/distancia";
import { calcularValorTotal } from "@/lib/orcamento/calcular";
import { isRedirectError } from "@/lib/utils/is-redirect-error";
import { atualizarEvento, excluirEvento, converterEventoParaTeste } from "./actions";
import { CategoriaPicker } from "./categoria-picker";
import { CustosExtras, type CustoExtra } from "./custos-extras";
import { Secao } from "./secao-form";
import { CadastroClienteVeiculo } from "./cadastro-cliente-veiculo";
import { montarTextoOrcamentoWhatsapp, linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";
import type { AgendamentoItem, Categoria } from "./tipos";

type Pessoa = { id: string; nome: string };
type ConfiguracoesOrcamento = { valor_km: number; fator_correcao_distancia: number };
type TipoServico = { id: string; nome: string; valor: number };
const COR_PADRAO = "#8b5cf6";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Dia da semana reduzido (ex.: "sex") pra mostrar ao lado do campo de data. */
function diaSemanaAbrev(dataIso: string): string {
  if (!dataIso) return "";
  const data = new Date(`${dataIso}T00:00`);
  if (Number.isNaN(data.getTime())) return "";
  return format(data, "EEE", { locale: ptBR });
}

/** Modal de evento: abre num resumo compacto (estilo Google Agenda) com editar/excluir no topo; "Editar" troca pro formulário. */
export function VerEventoModal({
  item,
  usuarioId,
  podeCriarTeste,
  open,
  onOpenChange,
  onAlterado,
}: {
  item: AgendamentoItem | null;
  usuarioId: string;
  podeCriarTeste: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlterado: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Evento</DialogTitle>
        </DialogHeader>
        {open && item && (
          <ConteudoEvento
            key={item.id}
            item={item}
            usuarioId={usuarioId}
            podeCriarTeste={podeCriarTeste}
            onOpenChange={onOpenChange}
            onAlterado={onAlterado}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoEvento({
  item,
  usuarioId,
  podeCriarTeste,
  onOpenChange,
  onAlterado,
}: {
  item: AgendamentoItem;
  usuarioId: string;
  podeCriarTeste: boolean;
  onOpenChange: (open: boolean) => void;
  onAlterado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const eTeste = item.tipo === "teste_opacidade";
  // Teste não tem edição/exclusão rápida aqui — isso acontece na tela de
  // detalhe, que também cuida de cadastro do cliente, veículo e proposta.
  const podeEditar = !eTeste && item.criado_por === usuarioId;
  const inicio = new Date(item.data_hora);
  const fim = item.data_hora_fim ? new Date(item.data_hora_fim) : inicio;

  // Teste sem endereço só acontece quando foi marcado "na empresa" (o
  // formulário sempre exige um dos dois) — busca o endereço da empresa só
  // nesse caso, pra sempre mostrar onde o teste será feito.
  const [enderecoEmpresa, setEnderecoEmpresa] = useState<string | null>(null);
  useEffect(() => {
    if (!eTeste || item.endereco) return;
    const supabase = createClient();
    supabase
      .from("dados_empresa")
      .select("endereco")
      .single()
      .then(({ data }) => data && setEnderecoEmpresa(data.endereco));
  }, [eTeste, item.endereco]);

  async function excluir() {
    await excluirEvento(item.id);
    onAlterado();
    onOpenChange(false);
  }

  if (!editando) {
    const mesmoDia = isSameDay(inicio, fim);
    const periodo = mesmoDia
      ? `${format(inicio, "EEEE, d 'de' MMMM", { locale: ptBR })} · ${format(inicio, "HH:mm")} – ${format(fim, "HH:mm")}`
      : `${format(inicio, "d 'de' MMM 'às' HH:mm", { locale: ptBR })} – ${format(fim, "d 'de' MMM 'às' HH:mm", { locale: ptBR })}`;

    return (
      <div className="space-y-3">
        {podeEditar && (
          <div className="absolute top-2 right-10 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Editar"
              className="text-brand hover:bg-brand/10"
              onClick={() => setEditando(true)}
            >
              <Pencil />
            </Button>
            <ConfirmDeleteButton
              label={<Trash2 />}
              ariaLabel="Excluir evento"
              variant="ghost"
              size="icon-sm"
              className="text-neutral-500 hover:bg-red-50 hover:text-red-600"
              title="Excluir este evento?"
              description="Essa ação não pode ser desfeita."
              onConfirm={excluir}
            />
          </div>
        )}

        <div className="flex items-start gap-3 pr-16">
          <span
            className="mt-1.5 size-3.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.categoria?.cor ?? COR_PADRAO }}
          />
          <div className="min-w-0">
            <h3 className="text-lg leading-snug font-medium text-neutral-900">
              {eTeste ? (item.cliente ?? "Teste de opacidade") : item.titulo}
            </h3>
            <p className="text-sm text-neutral-500 capitalize">{periodo}</p>
          </div>
        </div>

        {!eTeste && item.descricao && (
          <p className="pl-[1.625rem] text-sm whitespace-pre-wrap text-neutral-700">{item.descricao}</p>
        )}

        {(item.endereco || eTeste) && (
          <div className="flex items-start gap-3 pl-[0.0625rem]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-neutral-400" />
            <p className="text-sm text-neutral-600">
              {item.endereco || `Na empresa (Greenproject)${enderecoEmpresa ? ` — ${enderecoEmpresa}` : ""}`}
            </p>
          </div>
        )}

        {!eTeste && item.participantes.length > 0 && (
          <div className="flex items-start gap-3 pl-[0.0625rem]">
            <Users className="mt-0.5 size-4 shrink-0 text-neutral-400" />
            <p className="text-sm text-neutral-600">{item.participantes.map((p) => p.nome).join(", ")}</p>
          </div>
        )}

        {eTeste && (
          <>
            {item.veiculo && (
              <div className="flex items-start gap-3 pl-[0.0625rem]">
                <Car className="mt-0.5 size-4 shrink-0 text-neutral-400" />
                <p className="text-sm text-neutral-600">
                  {item.veiculo}
                  {item.tecnico && ` · Técnico: ${item.tecnico}`}
                </p>
              </div>
            )}
            <Link
              href={`/painel/agenda/${item.id}`}
              className="flex items-center gap-1 pl-[0.0625rem] text-sm font-medium text-brand hover:underline"
            >
              Ver detalhes completos
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <EditarEvento
      item={item}
      podeCriarTeste={podeCriarTeste}
      onOpenChange={onOpenChange}
      onAlterado={onAlterado}
      onCancelar={() => setEditando(false)}
      onExcluir={excluir}
    />
  );
}

function EditarEvento({
  item,
  podeCriarTeste,
  onOpenChange,
  onAlterado,
  onCancelar,
  onExcluir,
}: {
  item: AgendamentoItem;
  podeCriarTeste: boolean;
  onOpenChange: (open: boolean) => void;
  onAlterado: () => void;
  onCancelar: () => void;
  onExcluir: () => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [equipe, setEquipe] = useState<Pessoa[] | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(item.categoria);

  const inicio = new Date(item.data_hora);
  const fim = item.data_hora_fim ? new Date(item.data_hora_fim) : inicio;

  const [dataInicio, setDataInicio] = useState(format(inicio, "yyyy-MM-dd"));
  const [horaInicio, setHoraInicio] = useState(format(inicio, "HH:mm"));
  const [dataFim, setDataFim] = useState(format(fim, "yyyy-MM-dd"));

  useEffect(() => {
    if (equipe) return;
    const supabase = createClient();
    supabase
      .from("usuarios_perfis")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setEquipe((data ?? []).map((u) => ({ id: u.id, nome: u.nome }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Na verdade é um teste" — troca o miolo do formulário pros campos de
  // teste; equipe/config só são buscados se a pessoa realmente ativar isso.
  const [viraTeste, setViraTeste] = useState(false);
  const [dadosTeste, setDadosTeste] = useState<{ config: ConfiguracoesOrcamento; tipos: TipoServico[] } | null>(null);

  function ativarViraTeste() {
    setViraTeste(true);
    if (dadosTeste) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("configuracoes_orcamento").select("valor_km, fator_correcao_distancia").single(),
      supabase.from("tipos_servico").select("id, nome, valor").eq("ativo", true).order("nome"),
    ]).then(([{ data: config }, { data: tipos }]) => {
      setDadosTeste({
        config: config ?? { valor_km: 0, fator_correcao_distancia: 1.4 },
        tipos: tipos ?? [],
      });
    });
  }

  // Contato — fica aqui em cima (não dentro de CamposTeste) porque o botão
  // de enviar orçamento por WhatsApp também precisa do número.
  const [nomeContato, setNomeContato] = useState(item.titulo ?? "");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [whatsappContato, setWhatsappContato] = useState("");

  async function handleSubmit(formData: FormData) {
    setErro(null);
    try {
      if (viraTeste) {
        await converterEventoParaTeste(item.id, formData);
        // Redireciona pra tela do teste (lança antes de retornar) — não
        // chega no onAlterado/onOpenChange abaixo, e tá correto: quem
        // converteu deve ver a tela do teste, não o modal fechando.
      } else {
        await atualizarEvento(item.id, formData);
        onAlterado();
        onOpenChange(false);
      }
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <form ref={formRef} action={(formData) => startTransition(() => handleSubmit(formData))} className="space-y-4">
      {podeCriarTeste && !viraTeste && (
        <button
          type="button"
          onClick={ativarViraTeste}
          className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <Wrench className="size-3.5" />
          Na verdade, isso é um agendamento de teste
        </button>
      )}

      {!viraTeste && (
        <div className="space-y-2">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" name="titulo" required defaultValue={item.titulo ?? ""} />
        </div>
      )}

      {viraTeste && (
        <Secao icon={User} comDivisor={false}>
          <Label htmlFor="nome_contato">Nome do contato</Label>
          <Input
            id="nome_contato"
            name="nome_contato"
            required
            value={nomeContato}
            onChange={(e) => setNomeContato(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_contato">WhatsApp</Label>
              <Input
                id="whatsapp_contato"
                name="whatsapp_contato"
                data-um-de="contato"
                placeholder="(31) 99999-9999"
                value={whatsappContato}
                onChange={(e) => setWhatsappContato(formatTelefone(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_contato">Telefone do contato</Label>
              <Input
                id="telefone_contato"
                name="telefone_contato"
                data-um-de="contato"
                placeholder="(31) 3333-3333"
                value={telefoneContato}
                onChange={(e) => setTelefoneContato(formatTelefoneFixo(e.target.value))}
              />
            </div>
            <p className="col-span-2 text-xs text-neutral-400">Preencha pelo menos um dos dois.</p>
          </div>

          <CadastroClienteVeiculo nomeSugerido={nomeContato} />
        </Secao>
      )}

      <Secao icon={Clock} comDivisor={!viraTeste}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="data_inicio">
              Data de início{" "}
              {dataInicio && <span className="font-normal text-neutral-400 capitalize">({diaSemanaAbrev(dataInicio)})</span>}
            </Label>
            <Input
              id="data_inicio"
              name="data_inicio"
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora_inicio">Hora de início</Label>
            <Input
              id="hora_inicio"
              name="hora_inicio"
              type="time"
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_fim">
              Data de fim{" "}
              {dataFim && <span className="font-normal text-neutral-400 capitalize">({diaSemanaAbrev(dataFim)})</span>}
            </Label>
            <Input
              id="data_fim"
              name="data_fim"
              type="date"
              required
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hora_fim">Hora de fim</Label>
            <Input id="hora_fim" name="hora_fim" type="time" required defaultValue={format(fim, "HH:mm")} />
          </div>
        </div>
      </Secao>

      <Secao icon={Palette}>
        <Label>Categoria (opcional)</Label>
        <CategoriaPicker categoriaId={categoria?.id ?? null} onChange={setCategoria} />
      </Secao>

      {!viraTeste && (
        <>
          <Secao icon={AlignLeft}>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea id="descricao" name="descricao" rows={3} defaultValue={item.descricao ?? ""} />
          </Secao>

          <Secao icon={MapPin}>
            <Label htmlFor="localizacao">Localização (opcional)</Label>
            <Input id="localizacao" name="localizacao" placeholder="Ex.: Sala de reuniões, endereço..." defaultValue={item.endereco ?? ""} />
          </Secao>

          <Secao icon={Users}>
            <Label>Participantes (opcional)</Label>
            {equipe ? (
              <AttendeePicker pessoas={equipe} selecionadosIniciais={item.participantes.map((p) => p.id)} />
            ) : (
              <p className="text-sm text-neutral-400">Carregando equipe...</p>
            )}
          </Secao>
        </>
      )}

      {viraTeste &&
        (dadosTeste ? (
          <CamposTeste
            configuracoesOrcamento={dadosTeste.config}
            tiposServico={dadosTeste.tipos}
            whatsappContato={whatsappContato}
            telefoneContato={telefoneContato}
            dataInicio={dataInicio}
            horaInicio={horaInicio}
          />
        ) : (
          <p className="text-sm text-neutral-400">Carregando...</p>
        ))}

      <ErrorModal erro={erro} onClose={() => setErro(null)} formRef={formRef} />

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={pending || (!viraTeste && !equipe) || (viraTeste && !dadosTeste)}
          className="bg-brand hover:bg-brand-dark"
        >
          {pending ? "Salvando..." : viraTeste ? "Transformar em teste" : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={viraTeste ? () => setViraTeste(false) : onCancelar}>
          Cancelar
        </Button>
        {!viraTeste && (
          <ConfirmDeleteButton
            label={<Trash2 />}
            ariaLabel="Excluir evento"
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-neutral-500 hover:bg-red-50 hover:text-red-600"
            title="Excluir este evento?"
            description="Essa ação não pode ser desfeita."
            onConfirm={onExcluir}
          />
        )}
      </div>
    </form>
  );
}

function CamposTeste({
  configuracoesOrcamento,
  tiposServico,
  whatsappContato,
  telefoneContato,
  dataInicio,
  horaInicio,
}: {
  configuracoesOrcamento: ConfiguracoesOrcamento;
  tiposServico: TipoServico[];
  whatsappContato: string;
  telefoneContato: string;
  dataInicio: string;
  horaInicio: string;
}) {
  const [tipoServicoId, setTipoServicoId] = useState(tiposServico[0]?.id ?? "");
  const [valorKm, setValorKm] = useState(String(configuracoesOrcamento.valor_km));
  const [valorServico, setValorServico] = useState(String(tiposServico[0]?.valor ?? 0));
  const [pedagio, setPedagio] = useState("0");
  const [alimentacao, setAlimentacao] = useState("0");
  const [custosExtras, setCustosExtras] = useState<CustoExtra[]>([]);

  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [coordenadas, setCoordenadas] = useState<Coordenada | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [kmManual, setKmManual] = useState("");
  const [kmEditadoManualmente, setKmEditadoManualmente] = useState(false);
  const [testeNaEmpresa, setTesteNaEmpresa] = useState(false);
  const [enderecoEmpresa, setEnderecoEmpresa] = useState<string | null>(null);

  function handleTesteNaEmpresa(marcado: boolean) {
    setTesteNaEmpresa(marcado);
    if (marcado && !enderecoEmpresa) {
      const supabase = createClient();
      supabase
        .from("dados_empresa")
        .select("endereco")
        .single()
        .then(({ data }) => data && setEnderecoEmpresa(data.endereco));
    }
  }

  async function buscarCep(cepLimpo: string) {
    setBuscandoCep(true);
    const resultado = await buscarEnderecoPorCep(cepLimpo);
    setBuscandoCep(false);
    if (!resultado) return;
    setEndereco(`${resultado.logradouro}, ${resultado.bairro} - ${resultado.cidade}/${resultado.uf}`);
    setCoordenadas(
      resultado.latitude !== null && resultado.longitude !== null
        ? { latitude: resultado.latitude, longitude: resultado.longitude }
        : null,
    );
  }

  function handleCepChange(valor: string) {
    const formatado = formatCep(valor);
    setCep(formatado);
    const digits = onlyDigits(formatado);
    if (digits.length === 8) buscarCep(digits);
  }

  function handleTipoServicoChange(id: string) {
    setTipoServicoId(id);
    const tipo = tiposServico.find((t) => t.id === id);
    if (tipo) setValorServico(String(tipo.valor));
  }

  const distanciaLinhaReta = useMemo(
    () => (coordenadas ? haversineKm(COORDENADAS_EMPRESA, coordenadas) : null),
    [coordenadas],
  );
  const kmEstimado = useMemo(
    () => (distanciaLinhaReta !== null ? distanciaLinhaReta * 2 * configuracoesOrcamento.fator_correcao_distancia : null),
    [distanciaLinhaReta, configuracoesOrcamento.fator_correcao_distancia],
  );
  const kmIdaVolta = testeNaEmpresa ? 0 : kmEditadoManualmente ? Number(kmManual || 0) : (kmEstimado ?? Number(kmManual || 0));
  const orcamentoTemDadosMinimos = testeNaEmpresa || kmIdaVolta > 0;

  function handleKmChange(valor: string) {
    setKmManual(valor);
    setKmEditadoManualmente(true);
  }

  const valorTotal = useMemo(
    () =>
      calcularValorTotal({
        kmIdaVolta,
        valorKm: Number(valorKm || 0),
        pedagio: Number(pedagio || 0),
        alimentacao: Number(alimentacao || 0),
        valorServico: Number(valorServico || 0),
        custosExtras: custosExtras.map((item) => ({ valor: Number(item.valor || 0) })),
      }),
    [kmIdaVolta, valorKm, pedagio, alimentacao, valorServico, custosExtras],
  );

  return (
    <>
      <Secao icon={Wrench}>
        <Label>Tipo de serviço</Label>
        <Select
          value={tipoServicoId}
          onValueChange={(value) => value && handleTipoServicoChange(value)}
          items={Object.fromEntries(tiposServico.map((t) => [t.id, t.nome]))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {tiposServico.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Secao>

      <Secao icon={MapPin}>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <Checkbox checked={testeNaEmpresa} onCheckedChange={(c) => handleTesteNaEmpresa(c === true)} />
          Teste será feito na empresa (sem deslocamento)
        </label>

        {!testeNaEmpresa && (
          <>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP do local do teste</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    name="cep"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className={buscandoCep ? "pr-9" : undefined}
                  />
                  {buscandoCep && (
                    <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-brand" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-24" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
          </>
        )}
      </Secao>

      <Secao icon={Calculator}>
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <p className="text-sm font-semibold text-neutral-700">Orçamento estimado</p>

        {testeNaEmpresa ? (
          <p className="text-sm text-neutral-600">
            Sem custo de deslocamento — teste será feito na empresa.
            {enderecoEmpresa && (
              <>
                <br />
                {enderecoEmpresa}
              </>
            )}
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="km_manual">
              Distância ida e volta (km) {!distanciaLinhaReta && cep && "— CEP sem coordenada, preencha manualmente"}
            </Label>
            <Input
              id="km_manual"
              type="number"
              step="0.1"
              value={kmEditadoManualmente ? kmManual : (kmEstimado !== null ? kmEstimado.toFixed(1) : kmManual)}
              onChange={(e) => handleKmChange(e.target.value)}
            />
            {distanciaLinhaReta !== null && (
              <p className="text-xs text-neutral-400">
                Memória de cálculo: {distanciaLinhaReta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km (linha
                reta) × 2 (ida e volta) ×{" "}
                {configuracoesOrcamento.fator_correcao_distancia.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}{" "}
                (fator de correção) = {kmEstimado!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
                {kmEditadoManualmente && " — valor acima ajustado manualmente"}
              </p>
            )}
            <p className="text-sm text-neutral-600">
              Valor do deslocamento ({kmIdaVolta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km ×{" "}
              {formatarMoeda(Number(valorKm || 0))}):{" "}
              <strong className="text-neutral-900">{formatarMoeda(kmIdaVolta * Number(valorKm || 0))}</strong>
            </p>
          </div>
        )}
        <input type="hidden" name="km_ida_volta" value={kmIdaVolta} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="valor_km">Valor por km (R$)</Label>
            <MoedaInput id="valor_km" name="valor_km" value={valorKm} onChange={setValorKm} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_servico">Valor do serviço (R$)</Label>
            <MoedaInput id="valor_servico" name="valor_servico" value={valorServico} onChange={setValorServico} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pedagio">Pedágio (R$)</Label>
            <MoedaInput id="pedagio" name="pedagio" value={pedagio} onChange={setPedagio} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alimentacao">Alimentação (R$)</Label>
            <MoedaInput id="alimentacao" name="alimentacao" value={alimentacao} onChange={setAlimentacao} />
          </div>
        </div>

        <CustosExtras itens={custosExtras} onChange={setCustosExtras} />

        <p className="text-right text-lg font-bold text-neutral-900">Total: {formatarMoeda(valorTotal)}</p>

        {(whatsappContato || telefoneContato) && !orcamentoTemDadosMinimos && (
          <p className="text-xs text-neutral-400">
            Preencha a distância (ou marque &quot;teste na empresa&quot;) pra liberar o envio do orçamento resumido.
          </p>
        )}
        {(whatsappContato || telefoneContato) && orcamentoTemDadosMinimos && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-brand text-brand hover:bg-brand/10"
            onClick={() =>
              window.open(
                linkWhatsapp(
                  whatsappContato || telefoneContato,
                  montarTextoOrcamentoWhatsapp({
                    nomeServico: tiposServico.find((t) => t.id === tipoServicoId)?.nome ?? "Teste de Opacidade",
                    dataHoraTexto:
                      dataInicio && horaInicio
                        ? format(new Date(`${dataInicio}T${horaInicio}`), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })
                        : "A definir",
                    local: testeNaEmpresa
                      ? `Na empresa (Greenproject)${enderecoEmpresa ? ` — ${enderecoEmpresa}` : ""}`
                      : endereco
                        ? `${endereco}${numero ? `, ${numero}` : ""}${cep ? ` · CEP ${cep}` : ""}`
                        : "A definir",
                    kmIdaVolta,
                    valorKm: Number(valorKm || 0),
                    pedagio: Number(pedagio || 0),
                    alimentacao: Number(alimentacao || 0),
                    valorServico: Number(valorServico || 0),
                    custosExtras: custosExtras
                      .filter((item) => item.descricao.trim())
                      .map((item) => ({ descricao: item.descricao, valor: Number(item.valor || 0) })),
                  }),
                ),
                "_blank",
              )
            }
          >
            <MessageCircle />
            Enviar orçamento resumido por WhatsApp
          </Button>
        )}

        <div
          className="flex items-center gap-2"
          title="Complete o cadastro do cliente e do veículo (depois de salvar) para liberar o orçamento oficial completo."
        >
          <Button type="button" variant="outline" disabled className="flex-1 gap-1.5 text-neutral-400">
            <Mail className="size-4" />
            Completo por e-mail
          </Button>
          <Button type="button" variant="outline" disabled className="flex-1 gap-1.5 text-neutral-400">
            <MessageCircle className="size-4" />
            Completo por WhatsApp
          </Button>
        </div>
        </div>
      </Secao>
    </>
  );
}
