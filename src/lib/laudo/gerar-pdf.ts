import fs from "node:fs/promises";
import path from "node:path";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
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
  const medicoes = (teste.testes_opacidade_medicoes ?? []).sort(
    (a: { ciclo_aceleracao: number }, b: { ciclo_aceleracao: number }) => a.ciclo_aceleracao - b.ciclo_aceleracao,
  );
  const hojeDate = new Date();
  const hoje = hojeDate.toLocaleDateString("pt-BR");
  const validadeDate = new Date(hojeDate);
  validadeDate.setFullYear(validadeDate.getFullYear() + 1);
  const validade = validadeDate.toLocaleDateString("pt-BR");
  const veiculoLabel = `${veiculo?.marca ?? ""} ${veiculo?.modelo ?? ""} - ${veiculo?.identificador ?? ""}`.trim();
  const { razaoSocial, cnpj, endereco, telefone } = await getDadosEmpresa();

  // Limites do motor (marcha lenta/rotação de corte/opacidade) — cadastro
  // técnico já existente (ANFAVEA ou manual), vinculado ao veículo. Só
  // busca se o veículo tiver uma especificação de motor associada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let especMotor: any = null;
  if (veiculo?.especificacao_motor_id) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("especificacoes_motor")
      .select("marcha_lenta_min, marcha_lenta_max, rotacao_corte_min, rotacao_corte_max, limite_opacidade")
      .eq("id", veiculo.especificacao_motor_id)
      .maybeSingle();
    especMotor = data;
  }

  let logoBuffer: Buffer | null = null;
  try {
    logoBuffer = await fs.readFile(path.join(process.cwd(), "public/brand/logo-completa.png"));
  } catch {
    logoBuffer = null;
  }
  const logoBase64 = logoBuffer ? `data:image/png;base64,${logoBuffer.toString("base64")}` : null;

  // Página 3 (certificado de calibração do equipamento) não é redesenhada —
  // é o PDF real anexado no cadastro do equipamento, mesclado como está.
  // A página 2 (ensaio) já foi redesenhada com dados do próprio sistema —
  // ver nota mais abaixo. Carrega o certificado antes de desenhar a capa
  // pra já cravar o total de páginas certo no cabeçalho.
  const certBuffer = await baixarArquivoInterno(equipamento?.pdf_certificado_calibracao_path);
  const certTipo = certBuffer ? detectarTipoArquivo(certBuffer) : null;
  let certDoc: PDFDocument | null = null;
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
  const totalPaginas = 2 + (certDoc?.getPageCount() ?? 0) + (certEhImagem ? 1 : 0);

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

  // ---------- Página 2: dados do ensaio ----------
  // Redesenhada com dados do nosso sistema (não é mais o PDF exportado pelo
  // Syscon mesclado) — dados cadastrais de cliente/veículo digitados
  // diretamente no aparelho do opacímetro podem estar errados/desatualizados
  // (ex.: técnico reaproveitou um teste anterior sem trocar os dados no
  // equipamento), então a fonte de verdade tem que ser sempre o cadastro
  // já confirmado aqui na plataforma. `parseEnsaioSyscon`
  // (src/lib/syscon/parse-ensaio.ts) já seguia essa mesma regra pros dados
  // de medição — só nunca tinha sido aplicada ao layout do PDF final.
  // Estrutura desta página segue a mesma organização do relatório que o
  // Syscon exporta (Dados do Veículo / Dados do Cliente / Dados do Ensaio /
  // medições / Resultado / Dados do Opacímetro) — texto simples com
  // divisórias finas, não o estilo de barra verde da capa. Helpers locais
  // só usados aqui, por isso não sobem pro nível dos outros (blocoGrid etc.).
  function tituloSecaoEnsaio(titulo: string, startY: number): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(titulo, margin, startY);
    return startY + 5;
  }
  function linhaEnsaio(startY: number, esquerda: string | null, direita?: string | null): number {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    if (esquerda) doc.text(esquerda, margin, startY);
    if (direita) doc.text(direita, pageW / 2 + 10, startY);
    return startY + 4.6;
  }
  function divisorEnsaio(startY: number): number {
    doc.setDrawColor(190, 190, 190);
    doc.line(margin, startY, pageW - margin, startY);
    return startY + 5;
  }

  doc.addPage();
  cabecalho(2);
  y = 35;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(`Ensaio de Opacidade Nº ${teste.numero_teste ?? "-"}`, pageW / 2, y, { align: "center" });
  y = divisorEnsaio(y + 4);

  y = tituloSecaoEnsaio("Dados do Veículo", y);
  const limiteMarchaLenta =
    especMotor?.marcha_lenta_min != null && especMotor?.marcha_lenta_max != null
      ? `${especMotor.marcha_lenta_min} - ${especMotor.marcha_lenta_max}`
      : "-";
  const limiteRotacaoCorte =
    especMotor?.rotacao_corte_min != null && especMotor?.rotacao_corte_max != null
      ? `${especMotor.rotacao_corte_min} - ${especMotor.rotacao_corte_max}`
      : "-";
  const limiteOpacidade = especMotor?.limite_opacidade != null ? String(especMotor.limite_opacidade) : "-";
  y = linhaEnsaio(y, `Marca: ${veiculo?.marca ?? "-"}`, `Limite marcha lenta: ${limiteMarchaLenta}`);
  y = linhaEnsaio(y, `Modelo: ${veiculo?.modelo ?? "-"}`);
  y = linhaEnsaio(
    y,
    `Tipo motor: ${veiculo?.identificacao_motor ?? "-"}`,
    `Limite rotação de corte: ${limiteRotacaoCorte}`,
  );
  y = linhaEnsaio(y, null, `Limite opacidade: ${limiteOpacidade}`);
  y = linhaEnsaio(
    y,
    `${veiculo?.tipo_ativo === "veiculo" ? "Placa" : "Identificador"}: ${veiculo?.identificador ?? "-"}     Fabricação: ${veiculo?.ano ?? "-"}`,
  );
  y = divisorEnsaio(y + 1);

  y = tituloSecaoEnsaio("Dados do Cliente", y);
  y = linhaEnsaio(y, `${cliente?.nome ?? "-"} - CNPJ/CPF: ${cliente?.cnpj_cpf ?? "-"}`);
  y = linhaEnsaio(y, `Endereço: ${cliente?.endereco ?? "-"}`);
  y = linhaEnsaio(y, `Fone: ${cliente?.telefone ?? "-"}`);
  y = divisorEnsaio(y + 1);

  y = tituloSecaoEnsaio("Dados do Ensaio", y);
  y = linhaEnsaio(y, `Início: ${hoje}`);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Aceleração", "Rotação de corte", "Tempo", "Opacidade K(m-1)"]],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: medicoes.map((m: any) => [
      m.ciclo_aceleracao,
      m.rotacao_corte ?? "-",
      `${m.tempo_segundos ?? 4} s`,
      m.opacidade_m1 ?? "-",
    ]),
    headStyles: { fillColor: BRAND },
    styles: { fontSize: 9, halign: "center" },
    margin: { left: margin, right: margin },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;
  y = divisorEnsaio(y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `Resultado do Veículo   ${veiculo?.identificador ?? "-"}   Média: ${teste.media_m1 ?? "-"}   ${resultadoTexto}`,
    margin,
    y,
  );
  y += 7;
  y = linhaEnsaio(y, `Data do ensaio: ${hoje}     Validade: ${validade}`, `Responsável: ${responsavel.nome ?? "-"}`);
  y = divisorEnsaio(y + 1);

  const yOpacimetro = tituloSecaoEnsaio("Dados do Opacímetro/Software", y);
  y = linhaEnsaio(
    yOpacimetro,
    `Opacímetro modelo: ${equipamento?.modelo ?? "-"}     Serial: ${equipamento?.numero_serie ?? "-"}     Válido até: ${equipamento?.validade ? new Date(equipamento.validade).toLocaleDateString("pt-BR") : "-"}`,
  );
  linhaEnsaio(y, `Fabricante: ${equipamento?.fabricante ?? "-"}`);

  // Selo do fabricante (ex.: "Smoke Check 2000 — Opacímetro Portátil"),
  // opcional, cadastrado por equipamento em /painel/equipamentos — fica à
  // esquerda do QR code, mesma posição do selo no laudo original.
  const seloBuf = await baixarArquivoInterno(equipamento?.selo_imagem_path);
  const qrSize = 20;
  let seloW = 0;
  if (seloBuf) {
    try {
      const seloTipo = detectarTipoArquivo(seloBuf);
      const props = doc.getImageProperties(seloBuf);
      const seloH = 16;
      seloW = seloH * (props.width / props.height);
      doc.addImage(
        seloBuf,
        seloTipo === "webp" ? "WEBP" : seloTipo === "png" ? "PNG" : "JPEG",
        pageW - margin - qrSize - 4 - seloW,
        yOpacimetro - 3,
        seloW,
        seloH,
      );
    } catch {
      // imagem em formato não suportado pelo jsPDF — segue sem travar a emissão
      seloW = 0;
    }
  }

  // QR code de verificação pública — mesma posição (canto direito do bloco
  // "Dados do Opacímetro/Software") do QR code impresso pelo Syscon no
  // laudo original, mas gerado por nós e apontando pra nossa própria
  // página de verificação (o QR do Syscon aponta pro sistema deles, sem
  // utilidade nenhuma fora de lá).
  try {
    const qrDataUrl = await QRCode.toDataURL(`${COMPANY.siteUrl}/laudo/${codigoPublico}`, { margin: 0, width: 240 });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - qrSize, yOpacimetro - 3, qrSize, qrSize);
  } catch {
    // geração de QR code falhou — segue sem travar a emissão
  }

  rodape();

  // ---------- Página 3: certificado de calibração (só quando é imagem) ----------
  // Certificado em PDF de verdade é mesclado depois (ver mesclar() abaixo,
  // preserva o documento original). Se for foto, desenhamos aqui mesmo,
  // ainda dentro do `doc` principal — mais simples que antes porque não tem
  // mais nenhuma mesclagem *antes* dela (o ensaio virou página nossa, não
  // mesclada).
  if (certEhImagem && certBuffer) {
    doc.addPage();
    cabecalho(3);
    let yImg = 35;
    yImg = barraSecao("CERTIFICADO DE CALIBRAÇÃO DO EQUIPAMENTO", yImg) + 6;
    const larguraMax = pageW - margin * 2;
    const alturaMax = doc.internal.pageSize.getHeight() - yImg - 20;
    try {
      const props = doc.getImageProperties(certBuffer);
      const razao = props.width / props.height;
      let iw = larguraMax;
      let ih = iw / razao;
      if (ih > alturaMax) {
        ih = alturaMax;
        iw = ih * razao;
      }
      const x = margin + (larguraMax - iw) / 2;
      doc.addImage(certBuffer, certTipo === "webp" ? "WEBP" : certTipo === "png" ? "PNG" : "JPEG", x, yImg, iw, ih);
    } catch {
      // imagem em formato não suportado pelo jsPDF — segue sem travar a emissão
    }
    rodape();
  }

  const pdfBytes = doc.output("arraybuffer");
  const finalDoc = await PDFDocument.load(pdfBytes);

  // Certificado real em PDF é mesclado como está (não redesenhado) — só
  // recebe um carimbo pequeno (logo + "Página X de Y") por cima, igual ao
  // laudo original, já que o conteúdo dele não é nosso.
  if (certDoc) {
    const logoImagemPdfLib = logoBuffer ? await finalDoc.embedPng(logoBuffer).catch(() => null) : null;
    const fonteCarimbo = await finalDoc.embedFont(StandardFonts.Helvetica);
    let paginaAtual = 2;
    const paginas = await finalDoc.copyPages(certDoc, certDoc.getPageIndices());
    paginas.forEach((p) => {
      finalDoc.addPage(p);
      paginaAtual += 1;
      const { width, height } = p.getSize();
      if (logoImagemPdfLib) {
        const escala = 26 / logoImagemPdfLib.width;
        p.drawImage(logoImagemPdfLib, {
          x: 14,
          y: height - 14 - logoImagemPdfLib.height * escala,
          width: logoImagemPdfLib.width * escala,
          height: logoImagemPdfLib.height * escala,
        });
      }
      const texto = `Página ${paginaAtual} de ${totalPaginas}`;
      const larguraTexto = fonteCarimbo.widthOfTextAtSize(texto, 8);
      p.drawText(texto, {
        x: width - 14 - larguraTexto,
        y: 14,
        size: 8,
        font: fonteCarimbo,
        color: rgb(0.35, 0.35, 0.35),
      });
    });
  }

  return finalDoc.save();
}
