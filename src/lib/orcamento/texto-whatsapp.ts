import { DESCRICAO_SERVICO_OPACIDADE } from "./descricao-servico";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Texto simplificado do orçamento pra mandar no WhatsApp: deslocamento já
 * soma pedágio/alimentação numa linha só (o cliente não precisa do detalhe
 * interno do cálculo), serviço e cada custo extra aparecem descritos. Traz
 * também o que é entregue e a validade, pra não sobrar dúvida no resumo.
 */
export function montarTextoOrcamentoWhatsapp({
  nomeServico,
  dataHoraTexto,
  local,
  kmIdaVolta,
  valorKm,
  pedagio,
  alimentacao,
  valorServico,
  custosExtras,
}: {
  nomeServico: string;
  /** Data/hora e local do agendamento — pra o cliente sempre poder recorrer a essa mensagem e se situar. */
  dataHoraTexto: string;
  /**
   * Endereço puro, sem link do Google Maps embutido — o WhatsApp/iMessage já
   * detecta endereço em texto puro e deixa clicável, abrindo o app de mapa
   * que o cliente já usa (Waze, Google Maps, Apple Maps...), em vez de forçar
   * um app específico via link.
   */
  local: string;
  kmIdaVolta: number;
  valorKm: number;
  pedagio: number;
  alimentacao: number;
  valorServico: number;
  custosExtras: { descricao: string; valor: number }[];
}): string {
  const deslocamento = kmIdaVolta * valorKm + pedagio + alimentacao;
  const totalExtras = custosExtras.reduce((soma, item) => soma + item.valor, 0);
  const total = deslocamento + valorServico + totalExtras;

  const linhas = [
    "Segue o orçamento resumido da Greenproject Engenharia:",
    "",
    `*Data/hora:* ${dataHoraTexto}`,
    `*Local:* ${local}`,
    "",
    `*Serviço:* ${nomeServico}`,
    DESCRICAO_SERVICO_OPACIDADE,
    "",
    `Deslocamento: ${formatarMoeda(deslocamento)}`,
    `Valor do serviço: ${formatarMoeda(valorServico)}`,
    ...custosExtras.map((item) => `${item.descricao}: ${formatarMoeda(item.valor)}`),
    "",
    `*Total: ${formatarMoeda(total)}*`,
    "",
    "Orçamento válido por 15 dias. Este é um resumo — o orçamento oficial completo é enviado após o cadastro do cliente e do veículo.",
    "Qualquer dúvida, estamos à disposição!",
  ];
  return linhas.join("\n");
}

/** Link do WhatsApp Web/app já com o texto preenchido — assume DDI 55 quando o número não vem com ele. */
export function linkWhatsapp(telefone: string, texto: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(texto)}`;
}
