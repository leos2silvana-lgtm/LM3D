import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bluetooth,
  BluetoothConnected,
  Printer,
  FileDown,
  X,
  Copy,
  Check,
  MessageCircle,
  AlertCircle,
  Loader2,
  Unplug,
} from 'lucide-react';
import {
  buildPlainTextReceipt,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getConnectedPrinterName,
  isWebBluetoothSupported,
  PaperWidth,
  printViaBluetooth,
  RelatorioEstoqueLojaPrintData,
} from '../services/bluetoothPrinter';
import { downloadReceiptPdf, PdfPaperFormat } from '../services/receiptPdf';
import {
  formatCurrency,
  formatPDVCode,
  generateWhatsAppRestockReceipt,
  generateWhatsAppReturnReceipt,
  getPDVCapacidadeTotal,
  getSegmentoLabel,
} from '../utils/formatters';

interface BluetoothReceiptModalProps {
  data: RelatorioEstoqueLojaPrintData | null;
  initialPaperWidth?: PaperWidth;
  onClose: () => void;
}

export const BluetoothReceiptModal: React.FC<BluetoothReceiptModalProps> = ({
  data,
  initialPaperWidth = '58mm',
  onClose,
}) => {
  const [paperFormat, setPaperFormat] = useState<PdfPaperFormat>(initialPaperWidth);
  const [printerName, setPrinterName] = useState<string | null>(() =>
    getConnectedPrinterName()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  React.useEffect(() => {
    setPaperFormat(initialPaperWidth);
    setPrinterName(getConnectedPrinterName());
    setFeedback(null);
  }, [data, initialPaperWidth]);

  if (!data) return null;

  const webBtSupported = isWebBluetoothSupported();
  const bluetoothWidth: PaperWidth = paperFormat === '80mm' ? '80mm' : '58mm';

  const handleConnect = async () => {
    setIsConnecting(true);
    setFeedback(null);
    try {
      const res = await connectBluetoothPrinter();
      setPrinterName(res.name);
      setFeedback({
        type: 'success',
        text: `Impressora "${res.name}" pareada e pronta para imprimir.`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível conectar na impressora Bluetooth.';
      if (!msg.toLowerCase().includes('cancelled') && !msg.toLowerCase().includes('canceled')) {
        setFeedback({ type: 'error', text: msg });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectBluetoothPrinter();
    setPrinterName(null);
    setFeedback({
      type: 'info',
      text: 'Impressora Bluetooth desconectada.',
    });
  };

  const handlePrintBluetooth = async () => {
    setIsPrinting(true);
    setFeedback(null);
    try {
      const res = await printViaBluetooth(data, bluetoothWidth);
      setPrinterName(res.printerName);
      setFeedback({
        type: 'success',
        text: `Relatório enviado para "${res.printerName}" (${bluetoothWidth})!`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Falha ao enviar impressão via Bluetooth.';
      if (!msg.toLowerCase().includes('cancelled') && !msg.toLowerCase().includes('canceled')) {
        setFeedback({ type: 'error', text: msg });
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setFeedback(null);
    try {
      const filename = downloadReceiptPdf(data, paperFormat);
      setFeedback({
        type: 'success',
        text: `PDF "${filename}" gerado e baixado com todo o relatório ajustado à folha.`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o PDF.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSystemPrint = () => {
    document.body.classList.add('printing-thermal-receipt');
    const cleanup = () => {
      document.body.classList.remove('printing-thermal-receipt');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 1500);
    }, 80);
  };

  const handleCopyText = async () => {
    const text = buildPlainTextReceipt(data, bluetoothWidth);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Não foi possível copiar o texto automaticamente.',
      });
    }
  };

  const handleWhatsApp = () => {
    const cleanPhone = data.pdv.telefone.replace(/\D/g, '');
    const msg =
      data.tipoOperacao === 'recolher'
        ? generateWhatsAppReturnReceipt(
            data.pdv,
            data.itensMovimento,
            data.novoTotalLojaPecas,
            data.observacao
          )
        : generateWhatsAppRestockReceipt(
            data.pdv,
            data.itensMovimento.length > 0
              ? data.itensMovimento
              : data.estoqueCompletoLoja,
            data.novoTotalLojaPecas
          );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
  };

  const formattedDate = (() => {
    try {
      return new Date(data.dataHora).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return data.dataHora;
    }
  })();

  const tituloCupom =
    data.tipoOperacao === 'abastecer'
      ? 'ABASTECIMENTO & ESTOQUE NA LOJA'
      : data.tipoOperacao === 'recolher'
      ? 'RECOLHIMENTO & ESTOQUE NA LOJA'
      : 'RELATÓRIO DO ESTOQUE NA LOJA';

  const sheetPreviewClass =
    paperFormat === 'a4'
      ? 'w-full max-w-[620px] text-xs p-6 sm:p-8'
      : paperFormat === '80mm'
      ? 'w-full max-w-[430px] text-[11.5px] p-4 sm:p-5'
      : 'w-full max-w-[340px] text-[11px] p-3.5 sm:p-4';

  const sheetPrintClass =
    paperFormat === 'a4'
      ? 'w-full max-w-[180mm] text-[11pt] p-[8mm]'
      : paperFormat === '80mm'
      ? 'w-[74mm] text-[9pt] p-[2.5mm]'
      : 'w-[52mm] text-[8pt] p-[2mm]';

  const renderSheetContent = (isPrintPortal = false) => (
    <div
      className={`thermal-paper-sheet bg-white text-slate-950 font-mono leading-relaxed break-words overflow-hidden ${
        isPrintPortal
          ? sheetPrintClass
          : `${sheetPreviewClass} border border-slate-300 shadow-sm`
      }`}
    >
      {/* Header do Papel */}
      <div className="text-center border-b-2 border-dashed border-slate-400 pb-2.5 mb-2.5">
        <div className={paperFormat === 'a4' ? 'text-base font-black' : 'text-sm font-black tracking-tight'}>
          LM3D CONSIGNADOS
        </div>
        <div className="font-bold leading-snug">{tituloCupom}</div>
      </div>

      {/* Dados do Estabelecimento */}
      <div className="space-y-1 pb-2.5 border-b border-dashed border-slate-300">
        <div className="flex flex-wrap justify-between gap-x-2">
          <span className="text-slate-600">Data:</span>
          <span className="font-bold tabular-nums">{formattedDate}</span>
        </div>
        <div className="break-words">
          <span className="text-slate-600">Loja: </span>
          <strong className="font-bold">
            {data.pdv.nomeLoja} ({formatPDVCode(data.pdv)})
          </strong>
        </div>
        {data.pdv.responsavel && (
          <div className="break-words">
            <span className="text-slate-600">Resp.: </span>
            <span>{data.pdv.responsavel}</span>
          </div>
        )}
        <div className="break-words">
          <span className="text-slate-600">Segmento: </span>
          <span>{getSegmentoLabel(data.pdv.segmento)}</span>
        </div>
        {data.pdv.endereco && (
          <div className="break-words">
            <span className="text-slate-600">End.: </span>
            <span>{data.pdv.endereco}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-slate-600">Comissão da Loja:</span>
          <strong className="tabular-nums shrink-0">{data.pdv.comissaoLojaPorcentagem}%</strong>
        </div>
      </div>

      {/* Movimentação Atual */}
      {data.itensMovimento.length > 0 && data.tipoOperacao !== 'relatorio_atual' && (
        <div className="py-2.5 border-b-2 border-dashed border-slate-400 space-y-1.5">
          <div className="font-black">
            {data.tipoOperacao === 'abastecer'
              ? 'ITENS ABASTECIDOS AGORA'
              : 'ITENS RETIRADOS AGORA'}
          </div>

          <div className="space-y-1.5">
            {data.itensMovimento.map((item, idx) => (
              <div key={`${item.produtoId}-${idx}`} className="min-w-0">
                <div className="font-bold break-words leading-snug">
                  {item.produtoNome}
                  {item.codigo ? ` [${item.codigo}]` : ''}
                </div>
                <div className="flex items-baseline justify-between gap-2 tabular-nums text-slate-700 pl-2">
                  <span className="min-w-0">
                    {data.tipoOperacao === 'abastecer' ? '+' : '-'}
                    {item.quantidade} un x {formatCurrency(item.precoUnitario)}
                  </span>
                  <span className="font-bold text-slate-950 shrink-0">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1.5 border-t border-dashed border-slate-300 space-y-0.5 font-bold tabular-nums">
            <div className="flex justify-between gap-2">
              <span>
                {data.tipoOperacao === 'abastecer' ? 'Total Enviado:' : 'Total Retirado:'}
              </span>
              <span className="shrink-0">
                {data.tipoOperacao === 'abastecer' ? '+' : '-'}
                {data.totalMovimentoPecas} un
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Valor Movimentado:</span>
              <span className="shrink-0">{formatCurrency(data.valorMovimento)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Relatório Completo do Estoque Atual na Loja */}
      <div className="py-2.5 border-b-2 border-dashed border-slate-400 space-y-1.5">
        <div className="font-black">ESTOQUE ATUALIZADO NA LOJA</div>

        {data.estoqueCompletoLoja.length === 0 ? (
          <div className="text-slate-500">Nenhum item registrado no display.</div>
        ) : (
          <div className="space-y-1.5">
            {data.estoqueCompletoLoja.map((item, idx) => (
              <div key={`${item.produtoId}-stock-${idx}`} className="min-w-0">
                <div className="font-semibold break-words leading-snug">
                  {idx + 1}. {item.produtoNome}
                  {item.codigo ? ` (${item.codigo})` : ''}
                </div>
                <div className="flex items-baseline justify-between gap-2 tabular-nums text-slate-700 pl-3">
                  <span className="min-w-0">
                    {item.quantidade} un x {formatCurrency(item.precoUnitario)}
                  </span>
                  <span className="font-bold text-slate-950 shrink-0">
                    {formatCurrency(item.quantidade * item.precoUnitario)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-dashed border-slate-300 space-y-0.5 font-black tabular-nums">
          <div className="flex justify-between gap-2">
            <span>Total de Peças na Loja:</span>
            <span className="shrink-0">
              {data.novoTotalLojaPecas}/{getPDVCapacidadeTotal(data.pdv)} un
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Valor Total Consignado:</span>
            <span className="shrink-0">{formatCurrency(data.novoValorConsignadoLoja)}</span>
          </div>
        </div>
      </div>

      {data.observacao && data.observacao.trim() && (
        <div className="py-2 border-b border-dashed border-slate-300 break-words">
          <span className="font-bold">Obs.: </span>
          <span>{data.observacao.trim()}</span>
        </div>
      )}

      {/* Assinatura */}
      <div className="pt-4 space-y-5 text-center">
        <div className="text-left text-[10px] text-slate-600">
          Conferido / Assinatura do Estabelecimento:
        </div>
        <div className="border-b border-slate-800 pt-2" />
        <div className="text-[10px] text-slate-500">LM3D Impressão 3D · Consignação</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
                <Bluetooth className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  Impressão Bluetooth & PDF do Estoque
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  {data.pdv.nomeLoja} · {formatPDVCode(data.pdv)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Paper width / format toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Folha:</span>
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPaperFormat('58mm')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                    paperFormat === '58mm'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperFormat('80mm')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                    paperFormat === '80mm'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm
                </button>
                <button
                  type="button"
                  onClick={() => setPaperFormat('a4')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                    paperFormat === 'a4'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4
                </button>
              </div>
            </div>

            {/* Bluetooth pairing status */}
            <div className="flex items-center gap-2">
              {printerName ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <BluetoothConnected className="w-3.5 h-3.5" />
                    <span>{printerName}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    title="Desconectar impressora"
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isConnecting || !webBtSupported}
                  className="px-3 py-1.5 text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bluetooth className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isConnecting
                      ? 'Procurando...'
                      : webBtSupported
                      ? 'Parear Impressora Bluetooth'
                      : 'Bluetooth indisponível neste navegador'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`mx-5 mt-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Paper Receipt Preview */}
          <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/80 flex-1 flex justify-center items-start">
            {renderSheetContent(false)}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsApp}
                className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 text-rose-600" />
                )}
                <span>Baixar PDF ({paperFormat.toUpperCase()})</span>
              </button>

              <button
                type="button"
                onClick={handleSystemPrint}
                className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Sistema</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBluetooth}
                disabled={isPrinting || !webBtSupported}
                className="px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPrinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bluetooth className="w-4 h-4" />
                )}
                <span>
                  {isPrinting
                    ? 'Imprimindo...'
                    : `Bluetooth (${bluetoothWidth})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portal isolado no body para window.print() imprimir a folha inteira sem cortes */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="thermal-print-portal">{renderSheetContent(true)}</div>,
          document.body
        )}
    </>
  );
};
