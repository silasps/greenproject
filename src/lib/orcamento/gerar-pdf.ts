import fs from "node:fs/promises";
import path from "node:path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "@/lib/legal/company-info";
import { DESCRICAO_SERVICO_OPACIDADE } from "./descricao-servico";

const BRAND: [number, number, number] = [16, 155, 21]; // #109B15
const VALIDADE_DIAS = 15;

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function gerarPropostaPdf({
  proposta,
  clienteNome,
  veiculoLabel,
  dataHoraTexto,
  local,
  token,
  empresa,
}: {
  proposta: {
    km_ida_volta: number;
    valor_km: number;
    pedagio: number;
    alimentacao: number;
    valor_servico: number;
    custos_extras: { descricao: string; valor: number }[];
    valor_total: number;
  };
  clienteNome: string;
  veiculoLabel: string;
  /** Data/hora e local do agendamento — pra o cliente sempre poder consultar o PDF e se situar. */
  dataHoraTexto: string;
  local: string;
  token: string;
  /** Dados editáveis em Configurações > Empresa — impressos no rodapé/verificação do PDF. */
  empresa: { razaoSocial: string; cnpj: string; endereco: string; telefone: string };
}): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const dataValidade = new Date();
  dataValidade.setDate(dataValidade.getDate() + VALIDADE_DIAS);
  const validadeTexto = dataValidade.toLocaleDateString("pt-BR");

  let logoBase64: string | null = null;
  try {
    const logoBuffer = await fs.readFile(path.join(process.cwd(), "public/brand/logo-completa.png"));
    logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    logoBase64 = null;
  }

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 3, "F");
  if (logoBase64) doc.addImage(logoBase64, "PNG", margin, 8, 14, 13);
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text("PROPOSTA DE SERVIÇO", margin + 20, 15);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${hoje}`, pageW - margin, 15, { align: "right" });
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 24, pageW - margin, 24);

  let y = 34;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["DADOS DO CLIENTE"]],
    headStyles: { fillColor: BRAND, halign: "left" },
    body: [
      [`Cliente: ${clienteNome}`],
      [`Veículo/equipamento: ${veiculoLabel || "-"}`],
      [`Data/hora do atendimento: ${dataHoraTexto}`],
      [`Local: ${local}`],
    ],
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["SERVIÇO PRESTADO"]],
    headStyles: { fillColor: BRAND, halign: "left" },
    body: [[DESCRICAO_SERVICO_OPACIDADE]],
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: y,
    head: [["Item", "Valor"]],
    body: [
      [`Deslocamento (${proposta.km_ida_volta.toFixed(1)} km × ${formatarMoeda(proposta.valor_km)})`, formatarMoeda(proposta.km_ida_volta * proposta.valor_km)],
      ["Pedágio", formatarMoeda(proposta.pedagio)],
      ["Alimentação", formatarMoeda(proposta.alimentacao)],
      ["Valor do serviço", formatarMoeda(proposta.valor_servico)],
      ...proposta.custos_extras.map((item) => [item.descricao, formatarMoeda(item.valor)]),
    ],
    foot: [["TOTAL", formatarMoeda(proposta.valor_total)]],
    headStyles: { fillColor: BRAND },
    footStyles: { fillColor: [230, 230, 230], textColor: [20, 20, 20], fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Proposta válida até ${validadeTexto} (${VALIDADE_DIAS} dias a partir da emissão).`, margin, y);
  y += 5;
  doc.text(`Verificação e aceite: ${COMPANY.siteUrl}/proposta/${token}`, margin, y);

  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${empresa.razaoSocial} · CNPJ ${empresa.cnpj} · ${empresa.endereco} · ${empresa.telefone}`,
    pageW / 2,
    h - 8,
    { align: "center" },
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
