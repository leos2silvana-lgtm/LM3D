import { jsPDF } from 'jspdf';
import {
  formatCurrency,
  formatPDVCode,
  getPDVCapacidadeTotal,
  getSegmentoLabel,
} from '../utils/formatters';
import {
  PaperWidth,
  RelatorioEstoqueLojaPrintData,
} from './bluetoothPrinter';

export type PdfPaperFormat = PaperWidth | 'a4';

function formatDateTime(iso: string): string {
  try {
    const dt = new Date(iso);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    // ignore
  }
  return iso;
}

function sanitizeFileName(raw: string): string {
  return (raw || 'loja')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

interface PdfLineSpec {
  type: 'center-bold' | 'center' | 'text' | 'bold' | 'row' | 'row-bold' | 'hr' | 'dashed' | 'space';
  text?: string;
  left?: string;
  right?: string;
}

function buildPdfLines(data: RelatorioEstoqueLojaPrintData): PdfLineSpec[] {
  const specs: PdfLineSpec[] = [];

  const titulo =
    data.tipoOperacao === 'abastecer'
      ? 'ABASTECIMENTO & ESTOQUE NA LOJA'
      : data.tipoOperacao === 'recolher'
      ? 'RECOLHIMENTO & ESTOQUE NA LOJA'
      : 'RELATÓRIO DO ESTOQUE NA LOJA';

  specs.push({ type: 'center-bold', text: 'LM3D CONSIGNADOS' });
  specs.push({ type: 'center', text: titulo });
  specs.push({ type: 'hr' });

  specs.push({ type: 'row', left: 'Data:', right: formatDateTime(data.dataHora) });
  specs.push({
    type: 'bold',
    text: `Loja: ${data.pdv.nomeLoja} (${formatPDVCode(data.pdv)})`,
  });
  if (data.pdv.responsavel) {
    specs.push({ type: 'text', text: `Resp.: ${data.pdv.responsavel}` });
  }
  specs.push({ type: 'text', text: `Segmento: ${getSegmentoLabel(data.pdv.segmento)}` });
  if (data.pdv.endereco) {
    specs.push({ type: 'text', text: `End.: ${data.pdv.endereco}` });
  }
  specs.push({
    type: 'row',
    left: 'Comissão da Loja:',
    right: `${data.pdv.comissaoLojaPorcentagem}%`,
  });

  if (data.itensMovimento.length > 0 && data.tipoOperacao !== 'relatorio_atual') {
    specs.push({ type: 'hr' });
    specs.push({
      type: 'bold',
      text:
        data.tipoOperacao === 'abastecer'
          ? 'ITENS ABASTECIDOS AGORA'
          : 'ITENS RETIRADOS AGORA',
    });
    specs.push({ type: 'dashed' });

    data.itensMovimento.forEach((item) => {
      const prefix = data.tipoOperacao === 'abastecer' ? '+' : '-';
      const nome = item.codigo ? `${item.produtoNome} [${item.codigo}]` : item.produtoNome;
      specs.push({ type: 'bold', text: nome });
      specs.push({
        type: 'row',
        left: `  ${prefix}${item.quantidade} un x ${formatCurrency(item.precoUnitario)}`,
        right: formatCurrency(item.quantidade * item.precoUnitario),
      });
    });

    specs.push({ type: 'dashed' });
    specs.push({
      type: 'row-bold',
      left: data.tipoOperacao === 'abastecer' ? 'Total Enviado:' : 'Total Retirado:',
      right: `${data.tipoOperacao === 'abastecer' ? '+' : '-'}${data.totalMovimentoPecas} un`,
    });
    specs.push({
      type: 'row-bold',
      left: 'Valor Movimentado:',
      right: formatCurrency(data.valorMovimento),
    });
  }

  specs.push({ type: 'hr' });
  specs.push({ type: 'bold', text: 'ESTOQUE ATUALIZADO NA LOJA' });
  specs.push({ type: 'dashed' });

  if (data.estoqueCompletoLoja.length === 0) {
    specs.push({ type: 'text', text: 'Nenhum item registrado no display.' });
  } else {
    data.estoqueCompletoLoja.forEach((item, idx) => {
      const nome = `${idx + 1}. ${item.produtoNome}${item.codigo ? ` (${item.codigo})` : ''}`;
      specs.push({ type: 'bold', text: nome });
      specs.push({
        type: 'row',
        left: `   ${item.quantidade} un x ${formatCurrency(item.precoUnitario)}`,
        right: formatCurrency(item.quantidade * item.precoUnitario),
      });
    });
  }

  specs.push({ type: 'hr' });
  specs.push({
    type: 'row-bold',
    left: 'Total de Peças na Loja:',
    right: `${data.novoTotalLojaPecas}/${getPDVCapacidadeTotal(data.pdv)} un`,
  });
  specs.push({
    type: 'row-bold',
    left: 'Valor Total Consignado:',
    right: formatCurrency(data.novoValorConsignadoLoja),
  });

  if (data.observacao && data.observacao.trim()) {
    specs.push({ type: 'dashed' });
    specs.push({ type: 'text', text: `Obs.: ${data.observacao.trim()}` });
  }

  specs.push({ type: 'dashed' });
  specs.push({ type: 'space' });
  specs.push({ type: 'text', text: 'Conferido / Assinatura do Estabelecimento:' });
  specs.push({ type: 'space' });
  specs.push({ type: 'space' });
  specs.push({ type: 'hr' });
  specs.push({ type: 'center', text: 'LM3D Impressão 3D · Consignação' });

  return specs;
}

function renderSpecsToPdf(
  doc: jsPDF,
  specs: PdfLineSpec[],
  pageWidth: number,
  marginX: number,
  fontSize: number,
  lineHeight: number,
  allowMultiPage: boolean,
  pageHeightLimit: number
): number {
  const contentWidth = pageWidth - marginX * 2;
  let y = marginX + 3;

  const ensureSpace = (needed: number) => {
    if (allowMultiPage && y + needed > pageHeightLimit - marginX) {
      doc.addPage();
      y = marginX + 3;
    }
  };

  specs.forEach((spec) => {
    if (spec.type === 'space') {
      ensureSpace(lineHeight);
      y += lineHeight * 0.9;
      return;
    }

    if (spec.type === 'hr' || spec.type === 'dashed') {
      ensureSpace(lineHeight);
      doc.setDrawColor(spec.type === 'hr' ? 60 : 160);
      doc.setLineWidth(spec.type === 'hr' ? 0.35 : 0.2);
      doc.line(marginX, y - lineHeight * 0.3, pageWidth - marginX, y - lineHeight * 0.3);
      y += lineHeight * 0.55;
      return;
    }

    if (spec.type === 'center-bold' || spec.type === 'center') {
      const size = spec.type === 'center-bold' ? fontSize + 2 : fontSize;
      doc.setFont('helvetica', spec.type === 'center-bold' ? 'bold' : 'normal');
      doc.setFontSize(size);
      const wrapped: string[] = doc.splitTextToSize(spec.text || '', contentWidth);
      wrapped.forEach((line) => {
        ensureSpace(lineHeight + 1);
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += lineHeight + (spec.type === 'center-bold' ? 0.8 : 0);
      });
      return;
    }

    if (spec.type === 'row' || spec.type === 'row-bold') {
      const isBold = spec.type === 'row-bold';
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      const rightText = spec.right || '';
      const rightWidth = doc.getTextWidth(rightText);
      const maxLeftWidth = Math.max(12, contentWidth - rightWidth - 3);
      const leftWrapped: string[] = doc.splitTextToSize(spec.left || '', maxLeftWidth);

      leftWrapped.forEach((line, idx) => {
        ensureSpace(lineHeight);
        doc.text(line, marginX, y);
        if (idx === 0) {
          doc.text(rightText, pageWidth - marginX, y, { align: 'right' });
        }
        y += lineHeight;
      });
      return;
    }

    // 'text' | 'bold'
    doc.setFont('helvetica', spec.type === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const wrapped: string[] = doc.splitTextToSize(spec.text || '', contentWidth);
    wrapped.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    });
  });

  return y + marginX;
}

export function downloadReceiptPdf(
  data: RelatorioEstoqueLojaPrintData,
  format: PdfPaperFormat = '58mm'
): string {
  const specs = buildPdfLines(data);
  const pageWidth = format === 'a4' ? 210 : format === '80mm' ? 80 : 58;
  const marginX = format === 'a4' ? 16 : format === '80mm' ? 4.5 : 3.5;
  const fontSize = format === 'a4' ? 10.5 : format === '80mm' ? 8.5 : 7.5;
  const lineHeight = format === 'a4' ? 5.2 : format === '80mm' ? 4.1 : 3.6;

  if (format === 'a4') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    renderSpecsToPdf(doc, specs, 210, marginX, fontSize, lineHeight, true, 297);
    const filename = `relatorio-estoque-${sanitizeFileName(data.pdv.nomeLoja)}-a4.pdf`;
    doc.save(filename);
    return filename;
  }

  // Pass 1: measure exact required height on a generous temporary canvas so nothing is clipped
  const measureDoc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, 2000],
  });
  const totalHeight = renderSpecsToPdf(
    measureDoc,
    specs,
    pageWidth,
    marginX,
    fontSize,
    lineHeight,
    false,
    2000
  );

  // Pass 2: create exact-size thermal roll PDF
  const finalHeight = Math.max(90, Math.ceil(totalHeight + 4));
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, finalHeight],
  });
  renderSpecsToPdf(doc, specs, pageWidth, marginX, fontSize, lineHeight, false, finalHeight);

  const filename = `relatorio-estoque-${sanitizeFileName(data.pdv.nomeLoja)}-${format}.pdf`;
  doc.save(filename);
  return filename;
}
