"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addMonths, addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, AlignLeft, Users, User, Wrench, MapPin, Calculator, Palette, Loader2, MessageCircle, Mail, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { AttendeePicker } from "@/components/attendee-picker";
import { ErrorModal } from "@/components/error-modal";
import { formatTelefone, formatTelefoneFixo, formatCep, onlyDigits } from "@/lib/utils/mascaras";
import { buscarEnderecoPorCep } from "@/lib/geo/cep";
import { COORDENADAS_EMPRESA, haversineKm, type Coordenada } from "@/lib/geo/distancia";
import { calcularValorTotal } from "@/lib/orcamento/calcular";
import { MoedaInput } from "@/components/moeda-input";
import { isRedirectError } from "@/lib/utils/is-redirect-error";
import { criarEvento } from "./actions";
import { CategoriaPicker } from "./categoria-picker";
import { CustosExtras, type CustoExtra } from "./custos-extras";
import { Secao } from "./secao-form";
import { CadastroClienteVeiculo } from "./cadastro-cliente-veiculo";
import { montarTextoOrcamentoWhatsapp, linkWhatsapp } from "@/lib/orcamento/texto-whatsapp";

type Pessoa = { id: string; nome: string };
type ConfiguracoesOrcamento = { valor_km: number; fator_correcao_distancia: number };
type TipoServico = { id: string; nome: string; valor: number };

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

function CamposInicioFim({
  idPrefix,
  dataInicio,
  horaInicio,
  dataFim,
  horaFim,
  aoMudarInicio,
  aoMudarFim,
  diaInteiro = false,
}: {
  idPrefix: string;
  dataInicio: string;
  horaInicio: string;
  dataFim: string;
  horaFim: string;
  aoMudarInicio: (data: string, hora: string) => void;
  aoMudarFim: (data: string, hora: string) => void;
  diaInteiro?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_data_inicio`}>
          Data de início{" "}
          {dataInicio && <span className="font-normal text-neutral-400 capitalize">({diaSemanaAbrev(dataInicio)})</span>}
        </Label>
        <Input
          id={`${idPrefix}_data_inicio`}
          name="data_inicio"
          type="date"
          required
          value={dataInicio}
          onChange={(e) => aoMudarInicio(e.target.value, horaInicio)}
        />
      </div>
      {!diaInteiro && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}_hora_inicio`}>Hora de início</Label>
          <Input
            id={`${idPrefix}_hora_inicio`}
            name="hora_inicio"
            type="time"
            required
            value={horaInicio}
            onChange={(e) => aoMudarInicio(dataInicio, e.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}_data_fim`}>
          Data de fim{" "}
          {dataFim && <span className="font-normal text-neutral-400 capitalize">({diaSemanaAbrev(dataFim)})</span>}
        </Label>
        <Input
          id={`${idPrefix}_data_fim`}
          name="data_fim"
          type="date"
          required
          value={dataFim}
          onChange={(e) => aoMudarFim(e.target.value, horaFim)}
        />
      </div>
      {!diaInteiro && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}_hora_fim`}>Hora de fim</Label>
          <Input
            id={`${idPrefix}_hora_fim`}
            name="hora_fim"
            type="time"
            required
            value={horaFim}
            onChange={(e) => aoMudarFim(dataFim, e.target.value)}
          />
        </div>
      )}
      {diaInteiro && (
        <>
          <input type="hidden" name="hora_inicio" value="00:00" />
          <input type="hidden" name="hora_fim" value="23:59" />
        </>
      )}
    </div>
  );
}

export function EventoForm({
  equipe,
  podeCriarTeste,
  configuracoesOrcamento,
  tiposServico,
  dataInicial,
  horaInicial,
  clienteIdPreSelecionado,
  veiculoIdPreSelecionado,
  apenasTeste,
  onCancelar,
  onSucesso,
}: {
  equipe: Pessoa[];
  podeCriarTeste: boolean;
  configuracoesOrcamento: ConfiguracoesOrcamento;
  tiposServico: TipoServico[];
  dataInicial?: string;
  horaInicial?: string;
  clienteIdPreSelecionado?: string;
  veiculoIdPreSelecionado?: string;
  /** Abre já travado em "Teste", sem o toggle Evento/Teste — usado no botão "+" da lista de Testes. */
  apenasTeste?: boolean;
  onCancelar: () => void;
  onSucesso?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [eTeste, setETeste] = useState(apenasTeste || Boolean(clienteIdPreSelecionado));
  const [erro, setErro] = useState<string | null>(null);
  const [resumoWhatsappEnviado, setResumoWhatsappEnviado] = useState(false);
  const horaPadrao = horaInicial ?? "09:00";

  // Início/fim do agendamento — fim começa sempre 1h depois do início e
  // acompanha edições no início, até o usuário mexer no fim manualmente.
  const [dataInicio, setDataInicio] = useState(dataInicial ?? "");
  const [horaInicio, setHoraInicio] = useState(horaPadrao);
  const [fimManual, setFimManual] = useState(false);
  const fimPadrao = useMemo(() => {
    if (!dataInicial) return { data: dataInicial ?? "", hora: "" };
    const fim = addHours(new Date(`${dataInicial}T${horaPadrao}`), 1);
    return { data: format(fim, "yyyy-MM-dd"), hora: format(fim, "HH:mm") };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [dataFim, setDataFim] = useState(fimPadrao.data);
  const [horaFim, setHoraFim] = useState(fimPadrao.hora);

  const [diaInteiro, setDiaInteiro] = useState(false);

  function aoMudarInicio(novaData: string, novaHora: string) {
    setDataInicio(novaData);
    setHoraInicio(novaHora);
    if (!fimManual && novaData) {
      if (diaInteiro) {
        setDataFim(novaData);
      } else if (novaHora) {
        const fim = addHours(new Date(`${novaData}T${novaHora}`), 1);
        setDataFim(format(fim, "yyyy-MM-dd"));
        setHoraFim(format(fim, "HH:mm"));
      }
    }
  }

  function aoMudarFim(novaData: string, novaHora: string) {
    setFimManual(true);
    setDataFim(novaData);
    setHoraFim(novaHora);
  }

  function aoMudarDiaInteiro(valor: boolean) {
    setDiaInteiro(valor);
    if (valor && !fimManual && dataInicio) setDataFim(dataInicio);
  }

  const [categoriaId, setCategoriaId] = useState<string | null>(null);

  // Repetição (só pra evento) — cada ocorrência vira um agendamento
  // independente, editável/cancelável avulsamente depois.
  const [repetir, setRepetir] = useState("nunca");
  const [repetirAte, setRepetirAte] = useState("");
  const diaSemanaLabel = dataInicio ? format(new Date(`${dataInicio}T00:00`), "EEEE", { locale: ptBR }) : "";

  function aoMudarRepetir(valor: string) {
    setRepetir(valor);
    if (valor !== "nunca" && !repetirAte && dataInicio) {
      setRepetirAte(format(addMonths(new Date(`${dataInicio}T00:00`), 3), "yyyy-MM-dd"));
    }
  }

  // Contato
  const [nomeContato, setNomeContato] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [whatsappContato, setWhatsappContato] = useState("");

  // Endereço/CEP
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [coordenadas, setCoordenadas] = useState<Coordenada | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [kmManual, setKmManual] = useState("");
  const [kmEditadoManualmente, setKmEditadoManualmente] = useState(false);
  const [testeNaEmpresa, setTesteNaEmpresa] = useState(false);
  const [enderecoEmpresa, setEnderecoEmpresa] = useState<string | null>(null);

  /** Busca o endereço da empresa uma única vez (cacheado em memória) — usado
   * tanto pro aviso de "teste na empresa" quanto pro link de pesquisa de
   * distância no Google. */
  function garantirEnderecoEmpresa() {
    if (enderecoEmpresa) return;
    const supabase = createClient();
    supabase
      .from("dados_empresa")
      .select("endereco")
      .single()
      .then(({ data }) => data && setEnderecoEmpresa(data.endereco));
  }

  function handleTesteNaEmpresa(marcado: boolean) {
    setTesteNaEmpresa(marcado);
    if (marcado) garantirEnderecoEmpresa();
  }

  // Orçamento
  const [tipoServicoId, setTipoServicoId] = useState(tiposServico[0]?.id ?? "");
  const [valorKm, setValorKm] = useState(String(configuracoesOrcamento.valor_km));
  const [valorServico, setValorServico] = useState(String(tiposServico[0]?.valor ?? 0));
  const [pedagio, setPedagio] = useState("0");
  const [alimentacao, setAlimentacao] = useState("0");
  const [custosExtras, setCustosExtras] = useState<CustoExtra[]>([]);

  async function buscarCep(cepLimpo: string) {
    setBuscandoCep(true);
    garantirEnderecoEmpresa();
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

  // Distância linha reta → estimativa (×2 ida/volta ×fator) — a pessoa pode
  // sobrescrever o valor estimado quando conhece melhor a rota real.
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

  // O fator de correção (linha reta × fator fixo) erra feio em trechos
  // curtos — esse link poupa o usuário de abrir o Google/Maps manualmente
  // pra conferir a distância real de carro.
  const linkPesquisaDistancia = useMemo(() => {
    if (!enderecoEmpresa || !endereco) return null;
    const destino = `${endereco}${numero ? `, ${numero}` : ""}${cep ? ` - CEP ${cep}` : ""}`;
    const consulta = `distância de carro entre ${enderecoEmpresa} e ${destino}`;
    return `https://www.google.com/search?q=${encodeURIComponent(consulta)}`;
  }, [enderecoEmpresa, endereco, numero, cep]);

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

  async function handleSubmit(formData: FormData) {
    setErro(null);
    try {
      await criarEvento(formData);
      // Só chega aqui pro fluxo de evento — o de teste redireciona (lança
      // antes de retornar), então onSucesso não roda pra ele (correto: quem
      // criou teste deve ver a página do teste, não fechar o modal aqui).
      onSucesso?.();
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <form ref={formRef} action={(formData) => startTransition(() => handleSubmit(formData))} className="space-y-4">
      {podeCriarTeste && !apenasTeste && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setETeste(false)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !eTeste ? "bg-brand/15 text-brand" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
            )}
          >
            Evento
          </button>
          <button
            type="button"
            onClick={() => setETeste(true)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              eTeste ? "bg-brand/15 text-brand" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
            )}
          >
            Teste
          </button>
        </div>
      )}
      <input type="hidden" name="e_teste" value={eTeste ? "on" : "off"} />

      {!eTeste && (
        <>
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" required placeholder="Ex.: Reunião de equipe" />
          </div>

          <Secao icon={Clock} comDivisor={false}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
              <Checkbox checked={diaInteiro} onCheckedChange={(c) => aoMudarDiaInteiro(c === true)} />
              Dia inteiro
            </label>

            <CamposInicioFim
              idPrefix="evento"
              dataInicio={dataInicio}
              horaInicio={horaInicio}
              dataFim={dataFim}
              horaFim={horaFim}
              aoMudarInicio={aoMudarInicio}
              aoMudarFim={aoMudarFim}
              diaInteiro={diaInteiro}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Repetir</Label>
                <Select value={repetir} onValueChange={(v) => v && aoMudarRepetir(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nunca">Não se repete</SelectItem>
                    <SelectItem value="diaria">Diariamente</SelectItem>
                    <SelectItem value="semanal">Semanalmente{diaSemanaLabel && ` (${diaSemanaLabel})`}</SelectItem>
                    <SelectItem value="dias_uteis">Todo dia útil (seg a sex)</SelectItem>
                    <SelectItem value="mensal">Mensalmente</SelectItem>
                    <SelectItem value="anual">Anualmente</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="repetir" value={repetir} />
              </div>
              {repetir !== "nunca" && (
                <div className="space-y-2">
                  <Label htmlFor="repetir_ate">Repetir até</Label>
                  <Input
                    id="repetir_ate"
                    name="repetir_ate"
                    type="date"
                    required
                    min={dataInicio}
                    value={repetirAte}
                    onChange={(e) => setRepetirAte(e.target.value)}
                  />
                </div>
              )}
            </div>
          </Secao>

          <Secao icon={Palette}>
            <Label>Categoria (opcional)</Label>
            <CategoriaPicker categoriaId={categoriaId} onChange={(cat) => setCategoriaId(cat?.id ?? null)} />
          </Secao>

          <Secao icon={AlignLeft}>
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea id="descricao" name="descricao" rows={3} />
          </Secao>

          <Secao icon={MapPin}>
            <Label htmlFor="localizacao">Localização (opcional)</Label>
            <Input id="localizacao" name="localizacao" placeholder="Ex.: Sala de reuniões, endereço..." />
          </Secao>

          <Secao icon={Users}>
            <Label>Participantes (opcional)</Label>
            <AttendeePicker pessoas={equipe} />
          </Secao>
        </>
      )}

      {eTeste && (
        <>
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
            </div>
            <p className="text-xs text-neutral-400">Preencha pelo menos um dos dois.</p>

            <CadastroClienteVeiculo
              nomeSugerido={nomeContato}
              clienteIdPreSelecionado={clienteIdPreSelecionado}
              veiculoIdPreSelecionado={veiculoIdPreSelecionado}
            />
          </Secao>

          <Secao icon={Clock}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
              <Checkbox checked={diaInteiro} onCheckedChange={(c) => aoMudarDiaInteiro(c === true)} />
              Dia inteiro
            </label>

            <CamposInicioFim
              idPrefix="teste"
              dataInicio={dataInicio}
              horaInicio={horaInicio}
              dataFim={dataFim}
              horaFim={horaFim}
              aoMudarInicio={aoMudarInicio}
              aoMudarFim={aoMudarFim}
              diaInteiro={diaInteiro}
            />
          </Secao>

          <Secao icon={Palette}>
            <Label>Categoria (opcional)</Label>
            <CategoriaPicker categoriaId={categoriaId} onChange={(cat) => setCategoriaId(cat?.id ?? null)} />
          </Secao>

          <Secao icon={Wrench}>
            <Label>Tipo de serviço</Label>
            <input type="hidden" name="tipo_servico_id" value={tipoServicoId} />
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
                    <Input
                      id="numero"
                      name="numero"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      className="w-24"
                    />
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
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 space-y-3">
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
                      Memória de cálculo: {distanciaLinhaReta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
                      (linha reta) × 2 (ida e volta) ×{" "}
                      {configuracoesOrcamento.fator_correcao_distancia.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}{" "}
                      (fator de correção) = {kmEstimado!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km
                      {kmEditadoManualmente && " — valor acima ajustado manualmente"}
                    </p>
                  )}
                  {linkPesquisaDistancia && (
                    <a
                      href={linkPesquisaDistancia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                    >
                      <Search className="size-3.5" />
                      Conferir distância real no Google
                    </a>
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
                  onClick={() => {
                    setResumoWhatsappEnviado(true);
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
                    );
                  }}
                >
                  {resumoWhatsappEnviado ? <Check /> : <MessageCircle />}
                  {resumoWhatsappEnviado ? "Reenviar orçamento resumido por WhatsApp" : "Enviar orçamento resumido por WhatsApp"}
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
      )}

      <ErrorModal erro={erro} onClose={() => setErro(null)} formRef={formRef} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-dark">
          {pending ? "Salvando..." : eTeste ? "Criar teste" : "Criar evento"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
