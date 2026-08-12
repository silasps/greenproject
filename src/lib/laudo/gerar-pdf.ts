import fs from "node:fs/promises";
import path from "node:path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY } from "@/lib/legal/company-info";
import { textoConclusao } from "./texto-conclusao";

const BRAND: [number, number, number] = [16, 155, 21]; // #109B15

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TesteComRelacoes = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Responsavel = any;

async function baixarArquivoInterno(pathNoBucket: string | null | undefined): Promise<Buffer | null> {
  if (!pathNoBucket) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("arquivos-internos").download(pathNoBucket);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function gerarLaudoPdf({
  teste,
  responsavel,
  numero,
  codigoPublico,
}: {
  teste: TesteComRelacoes;
  responsavel: Responsavel;
  numero: string;
  codigoPublico: string;
}): Promise<Uint8Array> {
  const veiculo = teste.veiculos_maquinas;
  const cliente = veiculo?.clientes;
  const equipamento = teste.equipamentos_teste;
  const medicoes = (teste.testes_opacidade_medicoes ?? []).sort(
    (a: { ciclo_aceleracao: number }, b: { ciclo_aceleracao: number }) => a.ciclo_aceleracao - b.ciclo_aceleracao,
  );
  const hoje = new Date().toLocaleDateString("pt-BR");
  const veiculoLabel = `${veiculo?.marca ?? ""} ${veiculo?.modelo ?? ""} - ${veiculo?.identificador ?? ""}`.trim();

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  let logoBase64: string | null = null;
  try {
    const logoBuffer = await fs.readFile(path.join(process.cwd(), "public/brand/logo-completa.png"));
    logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  } catch {
    logoBase64 = null;
  }

  function cabecalho(pagina: number, totalPaginas: number) {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pageW, 3, "F");
    if (logoBase64) doc.addImage(logoBase64, "PNG", margin, 8, 14, 13);
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text("LAUDO DE OPACIDADE", margin + 20, 15);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Nº: ${numero}   Data: ${hoje}   Página ${pagina} de ${totalPaginas}`, pageW - margin, 15, {
      align: "right",
    });
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 24, pageW - margin, 24);
  }

  function rodape() {
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${COMPANY.razaoSocial} · CNPJ ${COMPANY.cnpj} · ${COMPANY.endereco} · ${COMPANY.telefone}`,
      pageW / 2,
      h - 8,
      { align: "center" },
    );
    doc.text(`Verificação pública: ${COMPANY.siteUrl}/laudo/${codigoPublico}`, pageW / 2, h - 4, {
      align: "center",
    });
  }

  // ---------- Página 1: capa ----------
  cabecalho(1, 3);
  let y = 32;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["DADOS DO VEÍCULO/MÁQUINA E PROPRIETÁRIO"]],
    headStyles: { fillColor: BRAND, halign: "left" },
    body: [
      [`Contratante: ${cliente?.nome ?? "-"}     CNPJ/CPF: ${cliente?.cnpj_cpf ?? "-"}`],
      [`Marca/Modelo: ${veiculo?.marca ?? "-"} ${veiculo?.modelo ?? "-"}     Identificador: ${veiculo?.identificador ?? "-"}     Ano: ${veiculo?.ano ?? "-"}`],
      [`Combustível: ${veiculo?.combustivel ?? "-"}     Chassi: ${veiculo?.chassi ?? "-"}     Renavam: ${veiculo?.renavam ?? "-"}`],
      [`Endereço: ${cliente?.endereco ?? "-"}`],
    ],
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FOTOS DO ENSAIO", margin, y);
  y += 3;

  const fotos = await Promise.all(
    [teste.foto_frente_path, teste.foto_traseira_path, teste.foto_painel_path].map(baixarArquivoInterno),
  );
  const fotoW = (pageW - margin * 2 - 8) / 3;
  fotos.forEach((buf, i) => {
    if (!buf) return;
    try {
      doc.addImage(buf, "JPEG", margin + i * (fotoW + 4), y, fotoW, fotoW * 0.75);
    } catch {
      // se não for JPEG válido, ignora silenciosamente — não deve travar a emissão
    }
  });
  y += fotoW * 0.75 + 10;

  doc.setFillColor(...BRAND);
  doc.rect(margin, y, pageW - margin * 2, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("CONCLUSÃO", pageW / 2, y + 4.2, { align: "center" });
  y += 10;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const resultadoTexto = teste.resultado === "aprovado" ? "APROVADO" : "REPROVADO";
  const paragrafo = doc.splitTextToSize(textoConclusao(teste.resultado, veiculoLabel), pageW - margin * 2);
  doc.text(paragrafo, margin, y);
  y += paragrafo.length * 4.2 + 6;

  doc.setFont("helvetica", "bold");
  doc.text(`Resultado: ${resultadoTexto}`, margin, y);
  y += 14;

  const assinaturaBuf = await baixarArquivoInterno(responsavel.imagem_assinatura_path);
  if (assinaturaBuf) {
    try {
      doc.addImage(assinaturaBuf, "PNG", margin, y - 10, 35, 14);
    } catch {
      // assinatura em formato não suportado — segue sem travar a emissão
    }
  }
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y + 6, margin + 70, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(responsavel.nome, margin, y + 10);
  doc.text([responsavel.formacao, responsavel.registro_conselho].filter(Boolean).join(" · "), margin, y + 14);

  rodape();

  // ---------- Página 2: dados do ensaio ----------
  doc.addPage();
  cabecalho(2, 3);
  y = 32;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["DADOS DO ENSAIO"]],
    headStyles: { fillColor: BRAND },
    body: [
      [`Número do ensaio: ${teste.numero_teste ?? "-"}     Resultado: ${resultadoTexto}     Média: ${teste.media_m1 ?? "-"} m-1`],
    ],
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  autoTable(doc, {
    startY: y,
    head: [["Aceleração", "Rotação de corte", "Tempo", "Opacidade K(m-1)"]],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: medicoes.map((m: any) => [
      m.ciclo_aceleracao,
      m.rotacao_corte ?? "-",
      `${m.tempo_segundos ?? 4}s`,
      m.opacidade_m1 ?? "-",
    ]),
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 9, halign: "center" },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  autoTable(doc, {
    startY: y,
    head: [["DADOS DO OPACÍMETRO"]],
    headStyles: { fillColor: BRAND },
    body: [
      [
        `Modelo: ${equipamento?.modelo ?? "-"}     Serial: ${equipamento?.numero_serie ?? "-"}     Válido até: ${equipamento?.validade ?? "-"}     Fabricante: ${equipamento?.fabricante ?? "-"}`,
      ],
    ],
    styles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });

  rodape();

  // ---------- Página 3: certificado de calibração ----------
  doc.addPage();
  cabecalho(3, 3);
  y = 32;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICADO DE CALIBRAÇÃO DO EQUIPAMENTO", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (equipamento?.pdf_certificado_calibracao_path) {
    doc.text(
      "O certificado de calibração do equipamento utilizado neste ensaio está anexado nas páginas seguintes.",
      margin,
      y,
    );
  } else {
    doc.text("Certificado de calibração não anexado no cadastro deste equipamento.", margin, y);
  }
  rodape();

  const pdfBytes = doc.output("arraybuffer");

  // Mescla o certificado real do equipamento (PDF anexado no cadastro) como
  // páginas finais, em vez de tentar redesenhar o layout de cada fabricante.
  const finalDoc = await PDFDocument.load(pdfBytes);
  const certBuffer = await baixarArquivoInterno(equipamento?.pdf_certificado_calibracao_path);
  if (certBuffer) {
    try {
      const certDoc = await PDFDocument.load(certBuffer);
      const paginas = await finalDoc.copyPages(certDoc, certDoc.getPageIndices());
      paginas.forEach((p) => finalDoc.addPage(p));
    } catch {
      // certificado corrompido/ilegível — segue sem travar a emissão do laudo
    }
  }

  return finalDoc.save();
}
