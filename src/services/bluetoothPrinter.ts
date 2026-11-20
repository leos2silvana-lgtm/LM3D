import { PontoDeVenda } from '../types';
import { formatCurrency, formatPDVCode, getPDVCapacidadeTotal, getSegmentoLabel } from '../utils/formatters';

export type PaperWidth = '58mm' | '80mm';

export interface ItemImpressaoEstoque {
  produtoId: string;
  produtoNome: string;
  codigo?: string;
  quantidade: number;
  precoUnitario: number;
}

export interface RelatorioEstoqueLojaPrintData {
  pdv: PontoDeVenda;
  tipoOperacao: 'abastecer' | 'recolher' | 'relatorio_atual';
  dataHora: string;
  itensMovimento: ItemImpressaoEstoque[];
  estoqueCompletoLoja: ItemImpressaoEstoque[];
  totalMovimentoPecas: number;
  valorMovimento: number;
  novoTotalLojaPecas: number;
  novoValorConsignadoLoja: number;
  observacao?: string;
}

// Minimal Web Bluetooth types so tsc compiles cleanly without @types/web-bluetooth
interface BluetoothCharacteristicLike {
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

interface BluetoothServiceLike {
  getCharacteristics(): Promise<BluetoothCharacteristicLike[]>;
}

interface BluetoothGATTServerLike {
  connected: boolean;
  connect(): Promise<BluetoothGATTServerLike>;
  disconnect(): void;
  getPrimaryServices(): Promise<BluetoothServiceLike[]>;
}

interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: BluetoothGATTServerLike;
  addEventListener?(type: string, listener: () => void): void;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice(options: {
      acceptAllDevices?: boolean;
      filters?: Array<{ services?: string[]; namePrefix?: string }>;
      optionalServices?: string[];
    }): Promise<BluetoothDeviceLike>;
  };
}

// Known BLE Thermal Printer GATT Service UUIDs (58mm / 80mm ESC/POS printers)
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
];

let cachedDevice: BluetoothDeviceLike | null = null;
let cachedCharacteristic: BluetoothCharacteristicLike | null = null;

export function isWebBluetoothSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean((navigator as NavigatorWithBluetooth).bluetooth?.requestDevice)
  );
}

export function getConnectedPrinterName(): string | null {
  if (cachedDevice?.gatt?.connected && cachedCharacteristic) {
    return cachedDevice.name || 'Impressora Bluetooth';
  }
  return null;
}

export function disconnectBluetoothPrinter(): void {
  try {
    if (cachedDevice?.gatt?.connected) {
      cachedDevice.gatt.disconnect();
    }
  } catch {
    // ignore
  }
  cachedDevice = null;
  cachedCharacteristic = null;
}

async function resolveWritableCharacteristic(
  device: BluetoothDeviceLike
): Promise<BluetoothCharacteristicLike> {
  if (!device.gatt) {
    throw new Error('Dispositivo Bluetooth sem suporte GATT.');
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const services = await server.getPrimaryServices();

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();
      const writable = characteristics.find(
        (c) => c.properties?.writeWithoutResponse || c.properties?.write
      );
      if (writable) {
        return writable;
      }
    } catch {
      // Skip restricted GATT services and inspect the next one
    }
  }

  throw new Error(
    'Nenhuma característica de escrita encontrada nesta impressora. Verifique se ela suporta BLE (Bluetooth Low Energy).'
  );
}

export async function connectBluetoothPrinter(): Promise<{ name: string }> {
  const nav = navigator as NavigatorWithBluetooth;
  if (!nav.bluetooth?.requestDevice) {
    throw new Error(
      'Web Bluetooth não está disponível neste navegador. Use o Google Chrome no Android/Desktop ou clique em "Imprimir Papel / Sistema".'
    );
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  const characteristic = await resolveWritableCharacteristic(device);

  cachedDevice = device;
  cachedCharacteristic = characteristic;

  if (device.addEventListener) {
    device.addEventListener('gattserverdisconnected', () => {
      cachedCharacteristic = null;
    });
  }

  return { name: device.name || 'Impressora Bluetooth' };
}

function toAscii(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ');
}

function padRight(text: string, width: number): string {
  const clean = toAscii(text);
  if (clean.length >= width) return clean.slice(0, width);
  return clean + ' '.repeat(width - clean.length);
}

function padLeft(text: string, width: number): string {
  const clean = toAscii(text);
  if (clean.length >= width) return clean.slice(0, width);
  return ' '.repeat(width - clean.length) + clean;
}

function twoColumns(left: string, right: string, cols: number): string {
  const r = toAscii(right);
  const maxLeft = Math.max(4, cols - r.length - 1);
  const l = toAscii(left).slice(0, maxLeft);
  const spaces = Math.max(1, cols - l.length - r.length);
  return `${l}${' '.repeat(spaces)}${r}`;
}

function wrapText(text: string, cols: number): string[] {
  const words = toAscii(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > cols) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += cols) {
        lines.push(word.slice(i, i + cols));
      }
      continue;
    }

    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= cols) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDateTimePtBr(iso: string): string {
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

function formatMoneyAscii(val: number): string {
  return toAscii(formatCurrency(val)).replace(/\u00A0/g, ' ');
}

export function buildPlainTextReceipt(
  data: RelatorioEstoqueLojaPrintData,
  paperWidth: PaperWidth = '58mm'
): string {
  const cols = paperWidth === '80mm' ? 44 : 30;
  const line = '-'.repeat(cols);
  const doubleLine = '='.repeat(cols);
  const lines: string[] = [];

  const titulo =
    data.tipoOperacao === 'abastecer'
      ? 'ABASTECIMENTO & ESTOQUE LOJA'
      : data.tipoOperacao === 'recolher'
      ? 'RECOLHIMENTO & ESTOQUE LOJA'
      : 'RELATORIO DE ESTOQUE NA LOJA';

  lines.push('LM3D CONSIGNADOS');
  lines.push(titulo);
  lines.push(doubleLine);
  lines.push(`Data: ${formatDateTimePtBr(data.dataHora)}`);
  lines.push(...wrapText(`Loja: ${data.pdv.nomeLoja} (${formatPDVCode(data.pdv)})`, cols));
  if (data.pdv.responsavel) {
    lines.push(...wrapText(`Resp.: ${data.pdv.responsavel}`, cols));
  }
  lines.push(...wrapText(`Seg.: ${getSegmentoLabel(data.pdv.segmento)}`, cols));
  if (data.pdv.endereco) {
    lines.push(...wrapText(`End.: ${data.pdv.endereco}`, cols));
  }
  lines.push(twoColumns('Comissao Loja:', `${data.pdv.comissaoLojaPorcentagem}%`, cols));

  if (data.itensMovimento.length > 0 && data.tipoOperacao !== 'relatorio_atual') {
    lines.push(line);
    lines.push(
      data.tipoOperacao === 'abastecer'
        ? 'ITENS ABASTECIDOS NESTA VISITA'
        : 'ITENS RETIRADOS NESTA VISITA'
    );
    lines.push(line);

    data.itensMovimento.forEach((item) => {
      const prefix = data.tipoOperacao === 'abastecer' ? '+' : '-';
      const nome = item.codigo ? `${item.produtoNome} [${item.codigo}]` : item.produtoNome;
      lines.push(...wrapText(nome, cols));
      lines.push(
        twoColumns(
          `  ${prefix}${item.quantidade} un x ${formatMoneyAscii(item.precoUnitario)}`,
          formatMoneyAscii(item.quantidade * item.precoUnitario),
          cols
        )
      );
    });

    lines.push(line);
    lines.push(
      twoColumns(
        data.tipoOperacao === 'abastecer' ? 'Total Enviado:' : 'Total Retirado:',
        `${data.totalMovimentoPecas} un`,
        cols
      )
    );
    lines.push(
      twoColumns('Valor Movimentado:', formatMoneyAscii(data.valorMovimento), cols)
    );
  }

  lines.push(doubleLine);
  lines.push('ESTOQUE ATUALIZADO NA LOJA');
  lines.push(line);

  if (data.estoqueCompletoLoja.length === 0) {
    lines.push('Nenhum item no estoque da loja.');
  } else {
    data.estoqueCompletoLoja.forEach((item, index) => {
      const idxLabel = `${index + 1}. ${item.produtoNome}${item.codigo ? ` (${item.codigo})` : ''}`;
      lines.push(...wrapText(idxLabel, cols));
      lines.push(
        twoColumns(
          `   Qtd: ${item.quantidade} un x ${formatMoneyAscii(item.precoUnitario)}`,
          formatMoneyAscii(item.quantidade * item.precoUnitario),
          cols
        )
      );
    });
  }

  lines.push(doubleLine);
  lines.push(
    twoColumns(
      'Total Pecas:',
      `${data.novoTotalLojaPecas}/${getPDVCapacidadeTotal(data.pdv)} un`,
      cols
    )
  );
  lines.push(
    twoColumns('Consignado:', formatMoneyAscii(data.novoValorConsignadoLoja), cols)
  );

  if (data.observacao && data.observacao.trim()) {
    lines.push(line);
    lines.push(...wrapText(`Obs: ${data.observacao.trim()}`, cols));
  }

  lines.push(line);
  lines.push('');
  lines.push('Conferido / Assinatura Loja:');
  lines.push('');
  lines.push('_'.repeat(cols));
  lines.push(padRight('LM3D Impressao 3D - Consignacao', cols));

  return lines.join('\n');
}

export function buildEscPosBytes(
  data: RelatorioEstoqueLojaPrintData,
  paperWidth: PaperWidth = '58mm'
): Uint8Array {
  const cols = paperWidth === '80mm' ? 44 : 30;
  const line = '-'.repeat(cols);
  const doubleLine = '='.repeat(cols);
  const encoder = new TextEncoder();
  const chunks: number[] = [];

  const pushBytes = (...bytes: number[]) => {
    chunks.push(...bytes);
  };
  const pushText = (text: string) => {
    const encoded = encoder.encode(toAscii(text));
    for (let i = 0; i < encoded.length; i++) {
      chunks.push(encoded[i]);
    }
  };
  const pushLine = (text = '') => {
    pushText(text);
    pushBytes(0x0a);
  };

  // ESC @ - Initialize printer
  pushBytes(0x1b, 0x40);

  // Center + Bold + Double Height Header
  pushBytes(0x1b, 0x61, 0x01); // Center
  pushBytes(0x1b, 0x45, 0x01); // Bold on
  pushBytes(0x1d, 0x21, 0x01); // Double height
  pushLine('LM3D CONSIGNADOS');
  pushBytes(0x1d, 0x21, 0x00); // Normal size

  const titulo =
    data.tipoOperacao === 'abastecer'
      ? 'ABASTECIMENTO & ESTOQUE LOJA'
      : data.tipoOperacao === 'recolher'
      ? 'RECOLHIMENTO & ESTOQUE LOJA'
      : 'RELATORIO DE ESTOQUE NA LOJA';
  wrapText(titulo, cols).forEach(pushLine);
  pushBytes(0x1b, 0x45, 0x00); // Bold off

  // Left align body
  pushBytes(0x1b, 0x61, 0x00);
  pushLine(doubleLine);
  wrapText(`Data: ${formatDateTimePtBr(data.dataHora)}`, cols).forEach(pushLine);
  wrapText(`Loja: ${data.pdv.nomeLoja} (${formatPDVCode(data.pdv)})`, cols).forEach(pushLine);
  if (data.pdv.responsavel) {
    wrapText(`Resp.: ${data.pdv.responsavel}`, cols).forEach(pushLine);
  }
  wrapText(`Seg.: ${getSegmentoLabel(data.pdv.segmento)}`, cols).forEach(pushLine);
  if (data.pdv.endereco) {
    wrapText(`End.: ${data.pdv.endereco}`, cols).forEach(pushLine);
  }
  pushLine(twoColumns('Comissao Loja:', `${data.pdv.comissaoLojaPorcentagem}%`, cols));

  if (data.itensMovimento.length > 0 && data.tipoOperacao !== 'relatorio_atual') {
    pushLine(line);
    pushBytes(0x1b, 0x45, 0x01);
    pushLine(
      data.tipoOperacao === 'abastecer'
        ? 'ITENS ABASTECIDOS AGORA'
        : 'ITENS RETIRADOS AGORA'
    );
    pushBytes(0x1b, 0x45, 0x00);
    pushLine(line);

    data.itensMovimento.forEach((item) => {
      const prefix = data.tipoOperacao === 'abastecer' ? '+' : '-';
      const nome = item.codigo ? `${item.produtoNome} [${item.codigo}]` : item.produtoNome;
      wrapText(nome, cols).forEach(pushLine);
      pushLine(
        twoColumns(
          `  ${prefix}${item.quantidade} un x ${formatMoneyAscii(item.precoUnitario)}`,
          formatMoneyAscii(item.quantidade * item.precoUnitario),
          cols
        )
      );
    });

    pushLine(line);
    pushBytes(0x1b, 0x45, 0x01);
    pushLine(
      twoColumns(
        data.tipoOperacao === 'abastecer' ? 'Total Enviado:' : 'Total Retirado:',
        `${data.tipoOperacao === 'abastecer' ? '+' : '-'}${data.totalMovimentoPecas} un`,
        cols
      )
    );
    pushLine(twoColumns('Valor Movimentado:', formatMoneyAscii(data.valorMovimento), cols));
    pushBytes(0x1b, 0x45, 0x00);
  }

  pushLine(doubleLine);
  pushBytes(0x1b, 0x45, 0x01);
  pushLine('ESTOQUE ATUALIZADO NA LOJA');
  pushBytes(0x1b, 0x45, 0x00);
  pushLine(line);

  if (data.estoqueCompletoLoja.length === 0) {
    pushLine('Nenhum item registrado na loja.');
  } else {
    data.estoqueCompletoLoja.forEach((item, idx) => {
      const label = `${idx + 1}. ${item.produtoNome}${item.codigo ? ` (${item.codigo})` : ''}`;
      wrapText(label, cols).forEach(pushLine);
      pushLine(
        twoColumns(
          `   ${item.quantidade} un x ${formatMoneyAscii(item.precoUnitario)}`,
          formatMoneyAscii(item.quantidade * item.precoUnitario),
          cols
        )
      );
    });
  }

  pushLine(doubleLine);
  pushBytes(0x1b, 0x45, 0x01);
  pushLine(
    twoColumns(
      'Total Pecas:',
      `${data.novoTotalLojaPecas}/${getPDVCapacidadeTotal(data.pdv)} un`,
      cols
    )
  );
  pushLine(
    twoColumns('Consignado:', formatMoneyAscii(data.novoValorConsignadoLoja), cols)
  );
  pushBytes(0x1b, 0x45, 0x00);

  if (data.observacao && data.observacao.trim()) {
    pushLine(line);
    wrapText(`Obs: ${data.observacao.trim()}`, cols).forEach(pushLine);
  }

  pushLine(line);
  pushLine('');
  pushLine('Conferido / Assinatura Loja:');
  pushLine('');
  pushLine('_'.repeat(cols));
  pushBytes(0x1b, 0x61, 0x01);
  pushLine('LM3D Consignados');
  pushBytes(0x1b, 0x61, 0x00);

  // Feed 4 lines & partial cut (ignored cleanly by printers without cutter)
  pushBytes(0x1b, 0x64, 0x04);
  pushBytes(0x1d, 0x56, 0x42, 0x00);

  return new Uint8Array(chunks);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function printViaBluetooth(
  data: RelatorioEstoqueLojaPrintData,
  paperWidth: PaperWidth = '58mm'
): Promise<{ printerName: string }> {
  if (!cachedDevice) {
    await connectBluetoothPrinter();
  } else if (!cachedDevice.gatt?.connected || !cachedCharacteristic) {
    cachedCharacteristic = await resolveWritableCharacteristic(cachedDevice);
  }

  if (!cachedCharacteristic || !cachedDevice) {
    throw new Error('Impressora Bluetooth não conectada.');
  }

  const payload = buildEscPosBytes(data, paperWidth);
  const chunkSize = 20;

  for (let offset = 0; offset < payload.length; offset += chunkSize) {
    const slice = payload.slice(offset, offset + chunkSize);
    if (
      cachedCharacteristic.properties?.writeWithoutResponse &&
      cachedCharacteristic.writeValueWithoutResponse
    ) {
      await cachedCharacteristic.writeValueWithoutResponse(slice);
    } else {
      await cachedCharacteristic.writeValue(slice);
    }
    await sleep(15);
  }

  return { printerName: cachedDevice.name || 'Impressora Bluetooth' };
}
