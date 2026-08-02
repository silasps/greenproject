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
  linkLocal,
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
  local: string;
  /** Link do Google Maps pro local — quando informado, some junto pra abrir direto no mapa/Waze. */
  linkLocal?: string;
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
    ...(linkLocal ? [`Ver no mapa: ${linkLocal}`] : []),
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

/** Link do Google Maps pro endereço — abre no app (Google Maps/Waze, conforme o padrão do aparelho) ou no navegador. */
export function linkGoogleMaps(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

/** Link do WhatsApp Web/app já com o texto preenchido — assume DDI 55 quando o número não vem com ele. */
export function linkWhatsapp(telefone: string, texto: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const comDdi = digitos.startsWith("55") ? digitos : `55${digitos}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(texto)}`;
}
