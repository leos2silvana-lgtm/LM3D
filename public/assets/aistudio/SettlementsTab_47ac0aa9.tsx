import React, { useState } from 'react';
import { FechamentoAcerto, PontoDeVenda } from '../types';
import { 
  formatCurrency, 
  formatShortDate, 
  formatPercent,
  generateWhatsAppReceipt 
} from '../utils/formatters';
import { 
  Receipt, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  DollarSign, 
  Layers, 
  Store, 
  FileText,
  Download,
  Eye,
  TrendingUp,
  Package
} from 'lucide-react';

interface SettlementsTabProps {
  acertos: FechamentoAcerto[];
  pdvs: PontoDeVenda[];
  onOpenNovoAcerto: (pdvId?: string) => void;
}

export const SettlementsTab: React.FC<SettlementsTabProps> = ({
  acertos,
  pdvs,
  onOpenNovoAcerto,
}) => {
  const [busca, setBusca] = useState('');
  const [selectedAcerto, setSelectedAcerto] = useState<FechamentoAcerto | null>(null);

  const acertosFiltrados = acertos.filter(a => 
    a.pdvNome.toLowerCase().includes(busca.toLowerCase()) ||
    a.codigoAcerto.toLowerCase().includes(busca.toLowerCase())
  );

  const totalVendidoBruto = acertos.reduce((acc, a) => acc + a.valorBrutoVendido, 0);
  const totalRepasseLM3D = acertos.reduce((acc, a) => acc + a.valorLiquidoLM3D, 0);
  const totalLucroLM3D = acertos.reduce((acc, a) => acc + a.lucroLiquidoLM3D, 0);
  const totalPecasVendidas = acertos.reduce((acc, a) => acc + a.totalPecasVendidas, 0);

  const handleSendWhatsApp = (acerto: FechamentoAcerto) => {
    const cleanPhone = acerto.pdvTelefone.replace(/\D/g, '');
    const encoded = generateWhatsAppReceipt(acerto);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2 sm:mb-3 border border-emerald-500/30">
            <Receipt className="w-3.5 h-3.5" />
            Conferência & Prestação de Contas
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Acertos & Fechamentos de Consignação
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Histórico das visitas de conferência de estoque, cálculo automático da comissão do lojista, recebimentos via PIX e envio de comprovante no WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenNovoAcerto()}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          Fazer Novo Acerto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500">Chaveiros Vendidos</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 leading-tight">
            {totalPecasVendidas} <span className="text-xs sm:text-sm font-semibold text-slate-400">un</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Em {acertos.length} visitas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500">Venda Bruta</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 leading-tight">
            {formatCurrency(totalVendidoBruto)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Preço consumidor</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-emerald-700">Líquido LM3D</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-1 leading-tight">
            {formatCurrency(totalRepasseLM3D)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Pós comissão da loja</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-teal-700">Lucro Líquido Real</span>
          <div className="text-lg sm:text-2xl font-black text-teal-600 mt-1 leading-tight">
            {formatCurrency(totalLucroLM3D)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Descontado filamento</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por loja ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {acertosFiltrados.length} fechamentos registrados
        </span>
      </div>

      {/* Mobile Settlement Cards (sm:hidden) */}
      <div className="space-y-3 sm:hidden">
        {acertosFiltrados.map((acerto) => (
          <div
            key={acerto.id}
            className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {acerto.codigoAcerto}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatShortDate(acerto.dataAcerto)}
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mt-1">
                  {acerto.pdvNome}
                </h3>
              </div>

              {acerto.statusPagamento === 'pago_pix' && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  PIX
                </span>
              )}
              {acerto.statusPagamento === 'pago_dinheiro' && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                  Dinheiro
                </span>
              )}
              {acerto.statusPagamento === 'pendente_a_receber' && (
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                  A Receber
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Vendidos</span>
                <strong className="text-slate-900 text-xs font-black">{acerto.totalPecasVendidas} un</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Comissão</span>
                <span className="text-blue-700 text-xs font-bold">{formatCurrency(acerto.comissaoLojaValor)}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase block">Líquido LM3D</span>
                <strong className="text-emerald-600 text-xs font-black">{formatCurrency(acerto.valorLiquidoLM3D)}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSendWhatsApp(acerto)}
                className="flex-1 min-h-[40px] py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSelectedAcerto(acerto)}
                className="min-h-[40px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 border border-slate-200"
              >
                <Eye className="w-4 h-4" />
                Detalhes
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Table of settlements (Desktop view) */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Código / Data</th>
                <th className="px-5 py-3.5">Ponto de Venda</th>
                <th className="px-5 py-3.5 text-center">Vendidas</th>
                <th className="px-5 py-3.5 text-right">Venda Bruta</th>
                <th className="px-5 py-3.5 text-right">Comissão Loja</th>
                <th className="px-5 py-3.5 text-right">Líquido LM3D</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {acertosFiltrados.map((acerto) => (
                <tr key={acerto.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-extrabold text-slate-900">{acerto.codigoAcerto}</div>
                    <div className="text-[11px] text-slate-400">{formatShortDate(acerto.dataAcerto)}</div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900">{acerto.pdvNome}</div>
                    <div className="text-[11px] text-slate-500">
                      {acerto.totalPecasRepostas > 0 ? `+${acerto.totalPecasRepostas} peças repostas` : 'Sem reposição'}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-center font-black text-slate-800">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-full">
                      {acerto.totalPecasVendidas} un.
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right font-bold text-slate-700">
                    {formatCurrency(acerto.valorBrutoVendido)}
                  </td>

                  <td className="px-5 py-4 text-right text-blue-700 font-semibold">
                    {formatCurrency(acerto.comissaoLojaValor)}
                    <span className="text-[10px] text-slate-400 block font-normal">
                      ({acerto.comissaoLojaPorcentagem}%)
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <span className="font-black text-emerald-600 text-sm block">
                      {formatCurrency(acerto.valorLiquidoLM3D)}
                    </span>
                    <span className="text-[10px] text-teal-600 font-bold block">
                      Lucro: +{formatCurrency(acerto.lucroLiquidoLM3D)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center">
                    {acerto.statusPagamento === 'pago_pix' && (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Pago via PIX
                      </span>
                    )}
                    {acerto.statusPagamento === 'pago_dinheiro' && (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Dinheiro
                      </span>
                    )}
                    {acerto.statusPagamento === 'pendente_a_receber' && (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        A Receber
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(acerto)}
                        title="Enviar comprovante no WhatsApp do lojista"
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-200"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAcerto(acerto)}
                        title="Ver detalhes do acerto"
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhe do Acerto */}
      {selectedAcerto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Comprovante de Fechamento
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedAcerto.codigoAcerto} • {selectedAcerto.pdvNome}
                </h3>
                <p className="text-xs text-slate-400">
                  Realizado em {formatShortDate(selectedAcerto.dataAcerto)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAcerto(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* List of items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Itens e Chaveiros Conferidos no Display:
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-3">Produto 3D</th>
                      <th className="p-3 text-center">Tinha</th>
                      <th className="p-3 text-center">Sobrou</th>
                      <th className="p-3 text-center">Vendidos</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedAcerto.itens.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {item.produtoFoto ? (
                              <img
                                src={item.produtoFoto}
                                alt={item.produtoNome}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block leading-tight">
                                {item.produtoNome}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Preço unit.: {formatCurrency(item.precoUnitario)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center text-slate-600">{item.qtdAnterior}</td>
                        <td className="p-3 text-center text-slate-600 font-semibold">{item.qtdRestante}</td>
                        <td className="p-3 text-center text-emerald-700 font-bold">
                          {item.qtdVendida} un.
                        </td>
                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(item.subtotalVendido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total de Chaveiros Vendidos:</span>
                <strong>{selectedAcerto.totalPecasVendidas} unidades</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Venda Total Bruta:</span>
                <strong>{formatCurrency(selectedAcerto.valorBrutoVendido)}</strong>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>Comissão da Loja ({selectedAcerto.comissaoLojaPorcentagem}%):</span>
                <strong>- {formatCurrency(selectedAcerto.comissaoLojaValor)}</strong>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-emerald-700 font-black text-sm">
                <span>Líquido a Repassar para a LM3D:</span>
                <span>{formatCurrency(selectedAcerto.valorLiquidoLM3D)}</span>
              </div>
              <div className="flex justify-between text-teal-600 text-[11px] font-bold">
                <span>Lucro Líquido Real LM3D:</span>
                <span>+{formatCurrency(selectedAcerto.lucroLiquidoLM3D)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAcerto(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(selectedAcerto)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar Comprovante via WhatsApp
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
