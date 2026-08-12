import fs from "node:fs/promises";
import path from "node:path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { COMPANY } from "@/lib/legal/company-info";
import { getDadosEmpresa } from "@/lib/legal/dados-empresa";
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

// O campo de certificado de calibração aceita "PDF ou foto" (o cadastro do
// equipamento permite as duas coisas) — precisa saber qual é de verdade
// pelos bytes, não só confiar no nome/extensão salva (às vezes o arquivo é
// uma imagem mesmo com o path terminando em .pdf).
function detectarTipoArquivo(buf: Buffer): "pdf" | "jpeg" | "png" | "webp" | "desconhecido" {
  if (buf.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";
  if (buf.subarray(0, 3).toString("hex") === "ffd8ff") return "jpeg";
  if (buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return "webp";
  }
  return "desconhecido";
}

export async function gerarLaudoPdf({
  teste,
  responsavel,
  numero,
  codigoPublico,
  revisao = 0,
}: {
  teste: TesteComRelacoes;
  responsavel: Responsavel;
  numero: string;
  codigoPublico: string;
  /** Coluna `laudos.revisao` — 0 na primeira emissão, ainda sem fluxo de reemissão que incremente. */
  revisao?: number;
}): Promise<Uint8Array> {
  const veiculo = teste.veiculos_maquinas;
  const cliente = veiculo?.clientes;
  const equipamento = teste.equipamentos_teste;
  const hoje = new Date().toLocaleDateString("pt-BR");
  const veiculoLabel = `${veiculo?.marca ?? ""} ${veiculo?.modelo ?? ""} - ${veiculo?.identificador ?? ""}`.trim();
  const { razaoSocial, cnpj, endereco, telefone } = await getDadosEmpresa();

  let logoBuffer: Buffer | null = null;
  try {
    logoBuffer = await fs.readFile(path.join(process.cwd(), "public/brand/logo-completa.png"));
  } catch {
    logoBuffer = null;
  }
  const logoBase64 = logoBuffer ? `data:image/png;base64,${logoBuffer.toString("base64")}` : null;

  // Páginas 2 (ensaio exportado do Syscon) e 3 (certificado de calibração do
  // equipamento) não são redesenhadas — são os PDFs reais já anexados no
  // sistema, mescladas como estão (igual ao laudo original: a capa é nossa,
  // o resto é o documento de fábrica/do equipamento de medição mesmo).
  // Carrega os dois antes de desenhar a capa pra já cravar o total de
  // páginas certo no cabeçalho (jsPDF não sabe esse número de antemão).
  const ensaioBuffer = await baixarArquivoInterno(teste.pdf_ensaio_original_path);
  const certBuffer = await baixarArquivoInterno(equipamento?.pdf_certificado_calibracao_path);
  const certTipo = certBuffer ? detectarTipoArquivo(certBuffer) : null;
  let ensaioDoc: PDFDocument | null = null;
  let certDoc: PDFDocument | null = null;
  try {
    if (ensaioBuffer) ensaioDoc = await PDFDocument.load(ensaioBuffer);
  } catch {
    ensaioDoc = null; // PDF corrompido/ilegível — segue sem travar a emissão
  }
  if (certTipo === "pdf" && certBuffer) {
    try {
      certDoc = await PDFDocument.load(certBuffer);
    } catch {
      certDoc = null;
    }
  }
  // Cadastro do equipamento aceita "PDF ou foto" pro certificado — se não é
  // um PDF de verdade mas é uma imagem reconhecida, ainda entra no laudo,
  // só que como página desenhada (imagem centralizada) em vez de mesclada.
  const certEhImagem = certTipo === "jpeg" || certTipo === "png" || certTipo === "webp";
  const totalPaginas = 1 + (ensaioDoc?.getPageCount() ?? 0) + (certDoc?.getPageCount() ?? 0) + (certEhImagem ? 1 : 0);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Caixa com Nº/Revisão/Data/Página no canto direito do cabeçalho — mesmo
  // padrão do laudo original gerado pelo Syscon (não é só uma linha de
  // texto solta, é uma tabelinha com borda, uma info por linha).
  function caixaCabecalho(pagina: number) {
    const boxW = 46;
    const boxX = pageW - margin - boxW;
    const boxY = 6;
    const linhaH = 4.6;
    const linhas: [string, string][] = [
      ["Nº:", numero],
      ["Revisão:", String(revisao)],
      ["Data:", hoje],
      ["Página:", `${pagina} de ${totalPaginas}`],
    ];

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(boxX, boxY, boxW, linhaH * linhas.length);
    linhas.forEach(([label, valor], i) => {
      const y = boxY + linhaH * i;
      if (i > 0) doc.line(boxX, y, boxX + boxW, y);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(90, 90, 90);
      doc.text(label, boxX + 2, y + linhaH - 1.6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 20, 20);
      doc.text(valor, boxX + boxW - 2, y + linhaH - 1.6, { align: "right" });
    });
  }

  function cabecalho(pagina: number) {
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, pageW, 3, "F");
    if (logoBase64) doc.addImage(logoBase64, "PNG", margin, 8, 14, 13);
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.text("LAUDO DE OPACIDADE", margin + 20, 15);
    caixaCabecalho(pagina);
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, 27, pageW - margin, 27);
  }

  // Bloco de campos rotulados (título pequeno em cinza + valor embaixo),
  // um por coluna, com borda — mesmo estilo de tabela do laudo original
  // (CONTRATANTE/CNPJ/PLACA/etc.), em vez de uma linha de texto corrida.
  // Mede a quebra de linha de verdade (doc.splitTextToSize) antes de decidir
  // a altura da linha — texto longo (ex.: razão social grande) que quebra
  // em 2 linhas não pode ficar cortado por uma célula baixa demais.
  function blocoGrid(startY: number, colunas: { titulo: string; linhas: (string | null | undefined)[] }[]): number {
    const colW = (pageW - margin * 2) / colunas.length;
    doc.setFontSize(8);
    const linhasVisuaisPorColuna = colunas.map((coluna) => {
      const valores = coluna.linhas.filter((l): l is string => Boolean(l));
      const base = valores.length > 0 ? valores : ["-"];
      return base.flatMap((linha) => doc.splitTextToSize(linha, colW - 4) as string[]);
    });
    const maxLinhasVisuais = Math.max(...linhasVisuaisPorColuna.map((l) => l.length));
    const h = 4.3 + maxLinhasVisuais * 3.4 + 1.2;
    autoTable(doc, {
      startY,
      theme: "grid",
      body: [colunas.map(() => "")],
      columnStyles: Object.fromEntries(colunas.map((_, i) => [i, { cellWidth: colW }])),
      styles: { minCellHeight: h, valign: "top" },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        const coluna = colunas[data.column.index];
        if (!coluna) return;
        const { x, y: cy } = data.cell;
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        doc.setFont("helvetica", "bold");
        doc.text(coluna.titulo.toUpperCase(), x + 2, cy + 3.8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        doc.text(linhasVisuaisPorColuna[data.column.index], x + 2, cy + 8);
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (doc as any).lastAutoTable.finalY;
  }

  function barraSecao(titulo: string, startY: number): number {
    doc.setFillColor(...BRAND);
    doc.rect(margin, startY, pageW - margin * 2, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(titulo, margin + 3, startY + 4.2);
    return startY + 6;
  }

  function rodape() {
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`${razaoSocial} · CNPJ ${cnpj} · ${endereco} · ${telefone}`, pageW / 2, h - 8, { align: "center" });
    doc.text(`Verificação pública: ${COMPANY.siteUrl}/laudo/${codigoPublico}`, pageW / 2, h - 4, {
      align: "center",
    });
  }

  // ---------- Página 1: capa ----------
  cabecalho(1);
  let y = 35;

  y = barraSecao("DADOS DO VEÍCULO/MÁQUINA E PROPRIETÁRIO", y);
  y = blocoGrid(y, [
    { titulo: "Contratante", linhas: [cliente?.nome] },
    { titulo: "CNPJ/CPF", linhas: [cliente?.cnpj_cpf] },
    { titulo: "Telefone", linhas: [cliente?.telefone] },
  ]);
  y = blocoGrid(y, [
    { titulo: "Marca/Modelo", linhas: [`${veiculo?.marca ?? ""} ${veiculo?.modelo ?? ""}`.trim() || null] },
    { titulo: veiculo?.tipo_ativo === "veiculo" ? "Placa" : "Identificador", linhas: [veiculo?.identificador] },
    { titulo: "Ano/Modelo", linhas: [veiculo?.ano ? String(veiculo.ano) : null] },
  ]);
  y = blocoGrid(y, [
    { titulo: "Chassi", linhas: [veiculo?.chassi] },
    { titulo: "Renavam", linhas: [veiculo?.renavam] },
    { titulo: "Combustível", linhas: [veiculo?.combustivel] },
  ]);
  y = blocoGrid(y, [{ titulo: "Endereço", linhas: [cliente?.endereco] }]);
  y += 4;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
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
  y += fotoW * 0.75 + 6;

  y = barraSecao("CONCLUSÃO", y) + 4;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const resultadoTexto = teste.resultado === "aprovado" ? "APROVADO" : "REPROVADO";
  const paragrafo = doc.splitTextToSize(textoConclusao(teste.resultado, veiculoLabel), pageW - margin * 2);
  doc.text(paragrafo, margin, y);
  y += paragrafo.length * 4.2 + 5;

  doc.setFont("helvetica", "bold");
  doc.text(`Resultado: ${resultadoTexto}`, margin, y);
  y += 6;

  // Caixa do responsável técnico — cabeçalho centralizado (cargo(s), nome,
  // CREA) + assinatura, mesmo formato de bloco do laudo original. Não
  // fabricamos um carimbo de assinatura digital (ICP-Brasil) — isso exige
  // certificado real, então é sempre a imagem cadastrada + o nome de quem
  // assina.
  const boxY = y;
  const formacoesResp = String(responsavel.formacao ?? "")
    .split("/")
    .map((f: string) => f.trim())
    .filter(Boolean);
  let ty = boxY + 4.5;
  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "bold");
  doc.text("RESPONSÁVEL TÉCNICO", pageW / 2, ty, { align: "center" });
  ty += 3.6;
  doc.setFont("helvetica", "normal");
  formacoesResp.forEach((f: string) => {
    doc.text(f.toUpperCase(), pageW / 2, ty, { align: "center" });
    ty += 3.3;
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  doc.text(String(responsavel.nome ?? "").toUpperCase(), pageW / 2, ty, { align: "center" });
  ty += 3.6;
  if (responsavel.registro_conselho) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(responsavel.registro_conselho, pageW / 2, ty, { align: "center" });
    ty += 3.6;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, ty + 1, pageW - margin, ty + 1);
  ty += 4;

  const assinaturaBuf = await baixarArquivoInterno(responsavel.imagem_assinatura_path);
  if (assinaturaBuf) {
    try {
      doc.addImage(assinaturaBuf, "PNG", margin + 4, ty, 32, 13);
    } catch {
      // assinatura em formato não suportado — segue sem travar a emissão
    }
  }
  doc.setDrawColor(150, 150, 150);
  doc.line(margin + 4, ty + 15, margin + 74, ty + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text(`Assinatura de ${responsavel.nome}`, margin + 4, ty + 19);
  ty += 21;

  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, boxY, pageW - margin * 2, ty - boxY);
  y = ty + 4;

  // Rodapé de identificação — mesmo bloco de 3 colunas do laudo original:
  // quem elaborou/revisou, quem aprovou (hoje é sempre o mesmo responsável
  // técnico escolhido ao liberar o laudo — o sistema não distingue papéis
  // diferentes ainda) e os dados completos de quem assina.
  const linhasEmissor = [
    ...formacoesResp,
    responsavel.nome,
    responsavel.registro_conselho,
    `Tel. ${telefone}`,
    COMPANY.email,
    COMPANY.siteUrl.replace(/^https?:\/\//, ""),
  ];
  y = blocoGrid(y, [
    { titulo: "Elaborado e revisado por", linhas: [responsavel.nome] },
    { titulo: "Aprovado por", linhas: [responsavel.nome] },
    { titulo: "Identificação do emissor do laudo", linhas: linhasEmissor },
  ]);

  rodape();

  const pdfBytes = doc.output("arraybuffer");
  const finalDoc = await PDFDocument.load(pdfBytes);

  const logoImagemPdfLib = logoBuffer ? await finalDoc.embedPng(logoBuffer).catch(() => null) : null;
  const fonteCarimbo = await finalDoc.embedFont(StandardFonts.Helvetica);
  let paginaAtual = 1;

  // Carimba um logo pequeno + "Página X de Y" nas páginas mescladas de
  // documentos de terceiros (Syscon, certificado) — mesmo tratamento visual
  // do laudo original, sem redesenhar o conteúdo desses documentos.
  function carimbarPagina(pagina: PDFPage) {
    const { width, height } = pagina.getSize();
    if (logoImagemPdfLib) {
      const escala = 26 / logoImagemPdfLib.width;
      pagina.drawImage(logoImagemPdfLib, {
        x: 14,
        y: height - 14 - logoImagemPdfLib.height * escala,
        width: logoImagemPdfLib.width * escala,
        height: logoImagemPdfLib.height * escala,
      });
    }
    const texto = `Página ${paginaAtual} de ${totalPaginas}`;
    const tamanho = 8;
    const larguraTexto = fonteCarimbo.widthOfTextAtSize(texto, tamanho);
    pagina.drawText(texto, {
      x: width - 14 - larguraTexto,
      y: 14,
      size: tamanho,
      font: fonteCarimbo,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  // comCarimbo=false pra página que já é nossa (tem cabeçalho/rodapé
  // próprio desenhado, ver construirPaginaCertificadoImagem) — só avança a
  // contagem de página, sem carimbar de novo em cima.
  async function mesclar(sourceDoc: PDFDocument | null, comCarimbo = true) {
    if (!sourceDoc) return;
    const paginas = await finalDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
    paginas.forEach((p) => {
      finalDoc.addPage(p);
      paginaAtual += 1;
      if (comCarimbo) carimbarPagina(p);
    });
  }

  // Certificado é foto, não PDF — em vez de mesclar um arquivo de terceiro,
  // desenhamos uma página nossa (mesmo cabeçalho com Nº/Revisão/Data/Página
  // da capa) com a imagem centralizada. Precisa ser um jsPDF separado (não
  // dá pra intercalar páginas jsPDF no meio de merges pdf-lib de um mesmo
  // doc.output()) — construído só depois de saber quantas páginas o ensaio
  // ocupou, pra cravar o número de página certo no cabeçalho.
  async function construirPaginaCertificadoImagem(paginaNum: number): Promise<PDFDocument | null> {
    if (!certEhImagem || !certBuffer) return null;
    const docImg = new jsPDF({ unit: "mm", format: "a4" });
    const w = docImg.internal.pageSize.getWidth();

    docImg.setFillColor(...BRAND);
    docImg.rect(0, 0, w, 3, "F");
    if (logoBase64) docImg.addImage(logoBase64, "PNG", margin, 8, 14, 13);
    docImg.setFontSize(14);
    docImg.setTextColor(20, 20, 20);
    docImg.setFont("helvetica", "bold");
    docImg.text("LAUDO DE OPACIDADE", margin + 20, 15);

    const boxW = 46;
    const boxX = w - margin - boxW;
    const boxY = 6;
    const linhaH = 4.6;
    const linhasBox: [string, string][] = [
      ["Nº:", numero],
      ["Revisão:", String(revisao)],
      ["Data:", hoje],
      ["Página:", `${paginaNum} de ${totalPaginas}`],
    ];
    docImg.setDrawColor(200, 200, 200);
    docImg.setLineWidth(0.2);
    docImg.rect(boxX, boxY, boxW, linhaH * linhasBox.length);
    linhasBox.forEach(([label, valor], i) => {
      const yy = boxY + linhaH * i;
      if (i > 0) docImg.line(boxX, yy, boxX + boxW, yy);
      docImg.setFontSize(7.5);
      docImg.setFont("helvetica", "bold");
      docImg.setTextColor(90, 90, 90);
      docImg.text(label, boxX + 2, yy + linhaH - 1.6);
      docImg.setFont("helvetica", "normal");
      docImg.setTextColor(20, 20, 20);
      docImg.text(valor, boxX + boxW - 2, yy + linhaH - 1.6, { align: "right" });
    });
    docImg.setDrawColor(220, 220, 220);
    docImg.line(margin, 27, w - margin, 27);

    let yImg = 35;
    docImg.setFillColor(...BRAND);
    docImg.rect(margin, yImg, w - margin * 2, 6, "F");
    docImg.setTextColor(255, 255, 255);
    docImg.setFontSize(9);
    docImg.setFont("helvetica", "bold");
    docImg.text("CERTIFICADO DE CALIBRAÇÃO DO EQUIPAMENTO", margin + 3, yImg + 4.2);
    yImg += 12;

    const larguraMax = w - margin * 2;
    const alturaMax = docImg.internal.pageSize.getHeight() - yImg - 20;
    try {
      const props = docImg.getImageProperties(certBuffer);
      const razao = props.width / props.height;
      let iw = larguraMax;
      let ih = iw / razao;
      if (ih > alturaMax) {
        ih = alturaMax;
        iw = ih * razao;
      }
      const x = margin + (larguraMax - iw) / 2;
      docImg.addImage(
        certBuffer,
        certTipo === "webp" ? "WEBP" : certTipo === "png" ? "PNG" : "JPEG",
        x,
        yImg,
        iw,
        ih,
      );
    } catch {
      // imagem em formato não suportado pelo jsPDF — segue sem travar a emissão
    }

    docImg.setFontSize(7.5);
    docImg.setTextColor(120, 120, 120);
    const hh = docImg.internal.pageSize.getHeight();
    docImg.text(`${razaoSocial} · CNPJ ${cnpj} · ${endereco} · ${telefone}`, w / 2, hh - 8, { align: "center" });
    docImg.text(`Verificação pública: ${COMPANY.siteUrl}/laudo/${codigoPublico}`, w / 2, hh - 4, {
      align: "center",
    });

    return PDFDocument.load(docImg.output("arraybuffer"));
  }

  // Mesma ordem do laudo original: ensaio (Syscon) sempre antes do
  // certificado de calibração, seja ele mesclado de verdade ou desenhado
  // como imagem.
  await mesclar(ensaioDoc);
  if (certEhImagem) {
    const certImagemDoc = await construirPaginaCertificadoImagem(paginaAtual + 1);
    await mesclar(certImagemDoc, false);
  } else {
    await mesclar(certDoc);
  }

  return finalDoc.save();
}
