import React, { useState, useMemo } from 'react';
import { PontoDeVenda, Produto3D, FechamentoAcerto, ItemAcertoConsignacao, StatusPagamentoAcerto } from '../types';
import { formatCurrency, formatShortDate, getPDVCapacidadeTotal, getPDVResumoDisplays } from '../utils/formatters';
import { X, Check, Receipt, Store, Sparkles, MessageCircle, AlertCircle, AlertTriangle, Package, Minus, Plus, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (acerto: FechamentoAcerto) => void;
  pdvs: PontoDeVenda[];
  produtos: Produto3D[];
  initialPdvId?: string;
}

export const NewSettlementModal: React.FC<NewSettlementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  pdvs,
  produtos,
  initialPdvId,
}) => {
  if (!isOpen) return null;

  const [selectedPdvId, setSelectedPdvId] = useState<string>(
    initialPdvId || (pdvs.length > 0 ? pdvs[0].id : '')
  );

  const pdv = pdvs.find(p => p.id === selectedPdvId) || pdvs[0];

  // Selection of items in this settlement
  const [itemsConferencia, setItemsConferencia] = useState<{
    produtoId: string;
    qtdAnterior: number;
    qtdRestante: number;
    qtdReposta: number;
  }[]>(() => {
    return produtos.slice(0, 5).map((p, idx) => ({
      produtoId: p.id,
      qtdAnterior: idx === 0 ? 12 : idx === 1 ? 10 : 8,
      qtdRestante: idx === 0 ? 3 : idx === 1 ? 2 : 4,
      qtdReposta: Math.min(p.estoqueAtelie, idx === 0 ? 10 : idx === 1 ? 8 : 4),
    }));
  });

  const [statusPagamento, setStatusPagamento] = useState<StatusPagamentoAcerto>('pago_pix');
  const [observacoes, setObservacoes] = useState('');

  // Handle change in count
  const handleUpdateItem = (produtoId: string, field: 'qtdRestante' | 'qtdReposta', value: number) => {
    setItemsConferencia(prev => prev.map(item => {
      if (item.produtoId === produtoId) {
        return { ...item, [field]: Math.max(0, value) };
      }
      return item;
    }));
  };

  const handleStepRestante = (produtoId: string, delta: number, max: number) => {
    setItemsConferencia(prev => prev.map(item => {
      if (item.produtoId === produtoId) {
        const nextVal = Math.min(max, Math.max(0, item.qtdRestante + delta));
        return { ...item, qtdRestante: nextVal };
      }
      return item;
    }));
  };

  const handleStepReposta = (produtoId: string, delta: number) => {
    setItemsConferencia(prev => prev.map(item => {
      if (item.produtoId === produtoId) {
        const nextVal = Math.max(0, item.qtdReposta + delta);
        return { ...item, qtdReposta: nextVal };
      }
      return item;
    }));
  };

  const handleSetMaxReposta = (produtoId: string, maxEstoque: number) => {
    setItemsConferencia(prev => prev.map(item => {
      if (item.produtoId === produtoId) {
        return { ...item, qtdReposta: Math.max(0, maxEstoque) };
      }
      return item;
    }));
  };

  // Itens com falta de estoque para reposição
  const itensComDeficitEstoque = useMemo(() => {
    return itemsConferencia
      .map(item => {
        const prod = produtos.find(p => p.id === item.produtoId);
        const estoqueAtelie = prod?.estoqueAtelie || 0;
        const temDeficit = item.qtdReposta > estoqueAtelie;
        const deficit = Math.max(0, item.qtdReposta - estoqueAtelie);
        return {
          ...item,
          produtoNome: prod?.nome || '',
          estoqueAtelie,
          temDeficit,
          deficit,
        };
      })
      .filter(i => i.temDeficit);
  }, [itemsConferencia, produtos]);

  const totalDeficitPecas = useMemo(() => {
    return itensComDeficitEstoque.reduce((acc, i) => acc + i.deficit, 0);
  }, [itensComDeficitEstoque]);

  const handleAjustarTodosParaEstoque = () => {
    setItemsConferencia(prev => prev.map(item => {
      const prod = produtos.find(p => p.id === item.produtoId);
      const estoqueAtelie = prod?.estoqueAtelie || 0;
      return {
        ...item,
        qtdReposta: Math.min(item.qtdReposta, estoqueAtelie),
      };
    }));
  };

  // Calculations
  const {
    itensDetalhados,
    totalPecasVendidas,
    totalPecasRepostas,
    valorBrutoVendido,
    comissaoLojaValor,
    valorLiquidoLM3D,
    custoProducaoTotal,
    lucroLiquidoLM3D,
  } = useMemo(() => {
    let vendidas = 0;
    let repostas = 0;
    let bruto = 0;
    let custo = 0;

    const itens: ItemAcertoConsignacao[] = itemsConferencia.map(c => {
      const prod = produtos.find(p => p.id === c.produtoId) || produtos[0];
      const qtdVendida = Math.max(0, c.qtdAnterior - c.qtdRestante);
      const subtotal = qtdVendida * prod.precoVenda;

      vendidas += qtdVendida;
      repostas += c.qtdReposta;
      bruto += subtotal;
      custo += qtdVendida * prod.custoProducao;

      return {
        produtoId: prod.id,
        produtoNome: prod.nome,
        produtoFoto: prod.fotoUrl,
        categoria: prod.categoria,
        precoUnitario: prod.precoVenda,
        custoUnitario: prod.custoProducao,
        qtdAnterior: c.qtdAnterior,
        qtdRestante: c.qtdRestante,
        qtdVendida,
        qtdReposta: c.qtdReposta,
        subtotalVendido: subtotal,
      };
    });

    const comissaoPercent = pdv ? pdv.comissaoLojaPorcentagem : 30;
    const comissaoValor = (bruto * comissaoPercent) / 100;
    const liquido = bruto - comissaoValor;
    const lucro = liquido - custo;

    return {
      itensDetalhados: itens,
      totalPecasVendidas: vendidas,
      totalPecasRepostas: repostas,
      valorBrutoVendido: bruto,
      comissaoLojaValor: comissaoValor,
      valorLiquidoLM3D: liquido,
      custoProducaoTotal: custo,
      lucroLiquidoLM3D: lucro,
    };
  }, [itemsConferencia, produtos, pdv]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdv) return;

    if (itensComDeficitEstoque.length > 0) {
      const confirmMsg = `ALERTA DE ESTOQUE INSUFICIENTE NO ATELIÊ:\n\nExistem ${itensComDeficitEstoque.length} modelo(s) com reposição superior ao estoque pronto (${totalDeficitPecas} peças em falta).\n\nDeseja registrar o acerto mesmo assim e produzir as peças em falta?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    const randomNum = Math.floor(100 + Math.random() * 900);
    const novoAcerto: FechamentoAcerto = {
      id: `acerto-${Date.now()}`,
      codigoAcerto: `LM3D-AC-${randomNum}`,
      pdvId: pdv.id,
      pdvNome: pdv.nomeLoja,
      pdvTelefone: pdv.telefone,
      dataAcerto: new Date().toISOString(),
      itens: itensDetalhados,
      totalPecasVendidas,
      totalPecasRepostas,
      valorBrutoVendido,
      comissaoLojaPorcentagem: pdv.comissaoLojaPorcentagem,
      comissaoLojaValor,
      valorLiquidoLM3D,
      custoProducaoVendido: custoProducaoTotal,
      lucroLiquidoLM3D,
      statusPagamento,
      observacoes,
    };

    try {
      confetti({ particleCount: 70, spread: 60 });
    } catch {
      // ignore
    }

    onSave(novoAcerto);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[96vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                Novo Acerto & Prestação de Contas
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Conferência de estoque e fechamento de comissão
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          
          {/* 1. Escolha da Loja */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ponto de Venda Parceiro (PDV)
            </label>
            <select
              value={selectedPdvId}
              onChange={(e) => setSelectedPdvId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
            >
              {pdvs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nomeLoja} ({p.responsavel}) — Comissão: {p.comissaoLojaPorcentagem}%
                </option>
              ))}
            </select>
            {pdv && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="font-semibold text-slate-700">Display & Peças no Local:</span>
                <span className="text-slate-600 font-medium truncate">{getPDVResumoDisplays(pdv)}</span>
                <span className="ml-auto font-bold text-slate-800 shrink-0">
                  {pdv.totalPecasNoDisplay} / {getPDVCapacidadeTotal(pdv)} un
                </span>
              </div>
            )}
          </div>

          {/* 2. Conferência de Chaveiros */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contagem no Expositor (Quantas Peças Restaram)
              </h4>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                Vendidos = Tinha - Sobrou
              </span>
            </div>

            {/* Alerta Geral de Estoque Insuficiente para Reposição */}
            {itensComDeficitEstoque.length > 0 && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3 sm:p-3.5 space-y-2 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-black text-rose-900 uppercase tracking-wide">
                        Estoque Insuficiente no Ateliê ({itensComDeficitEstoque.length} modelo{itensComDeficitEstoque.length > 1 ? 's' : ''})
                      </h5>
                      <p className="text-[11px] text-rose-700 leading-snug">
                        Faltam <strong>{totalDeficitPecas} peças</strong> prontas no Ateliê para suprir a reposição total solicitada.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAjustarTodosParaEstoque}
                    className="self-start sm:self-center px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-[11px] font-extrabold rounded-lg shadow-xs shrink-0 active:scale-95 transition-all"
                  >
                    Ajustar ao Estoque Disponível
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Card List View (sm:hidden) */}
            <div className="space-y-3 sm:hidden">
              {itemsConferencia.map((item) => {
                const prod = produtos.find(p => p.id === item.produtoId);
                if (!prod) return null;
                const vendidas = Math.max(0, item.qtdAnterior - item.qtdRestante);
                const subtotal = vendidas * prod.precoVenda;
                const estoqueDisp = prod.estoqueAtelie;
                const temFalta = item.qtdReposta > estoqueDisp;
                const faltaQtd = item.qtdReposta - estoqueDisp;

                return (
                  <div key={item.produtoId} className={`bg-slate-50 border rounded-2xl p-3 space-y-2.5 shadow-2xs ${
                    temFalta ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                  }`}>
                    {/* Top Info */}
                    <div className="flex items-center gap-2.5">
                      {prod.fotoUrl ? (
                        <img
                          src={prod.fotoUrl}
                          alt={prod.nome}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-extrabold text-slate-900 text-xs leading-tight truncate">
                            {prod.nome}
                          </span>
                          {prod.codigo && (
                            <span className="font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 shrink-0">
                              {prod.codigo}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] mt-1 text-slate-600 flex-wrap gap-1">
                          <span>Preço: <strong className="text-slate-900">{formatCurrency(prod.precoVenda)}</strong></span>
                          <span className="font-semibold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                            Tinha: <strong>{item.qtdAnterior} un</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Counter: Sobrou no Expositor */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">Sobrou no Display:</span>
                        {vendidas > 0 ? (
                          <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                            {vendidas} vendidos = {formatCurrency(subtotal)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-[10px]">Nenhum vendido</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStepRestante(item.produtoId, -1, item.qtdAnterior)}
                          className="w-10 h-10 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-black flex items-center justify-center text-base border border-slate-200 transition-transform active:scale-95 shrink-0"
                          aria-label="Diminuir peças que sobraram"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={item.qtdAnterior}
                          value={item.qtdRestante}
                          onChange={(e) => handleUpdateItem(item.produtoId, 'qtdRestante', Number(e.target.value))}
                          className="flex-1 h-10 text-center font-black text-base text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                        />

                        <button
                          type="button"
                          onClick={() => handleStepRestante(item.produtoId, 1, item.qtdAnterior)}
                          className="w-10 h-10 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-black flex items-center justify-center text-base border border-slate-200 transition-transform active:scale-95 shrink-0"
                          aria-label="Aumentar peças que sobraram"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Counter: Repor Peças com Sincronização e Alerta de Estoque */}
                    <div className={`p-2 rounded-xl border space-y-1.5 ${
                      temFalta ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-teal-800">Repor Novas Peças:</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                            estoqueDisp === 0
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : estoqueDisp <= 3
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            Ateliê: {estoqueDisp} un
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetMaxReposta(item.produtoId, estoqueDisp)}
                            className="px-1.5 py-0.5 text-[10px] font-extrabold bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-300 rounded-md"
                          >
                            Máx
                          </button>
                          {[1, 5, 10].map((quick) => (
                            <button
                              key={quick}
                              type="button"
                              onClick={() => handleStepReposta(item.produtoId, quick)}
                              className="px-1.5 py-0.5 text-[10px] font-extrabold bg-teal-50 active:bg-teal-100 text-teal-700 border border-teal-200 rounded-md active:scale-95"
                            >
                              +{quick}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStepReposta(item.produtoId, -1)}
                          className="w-10 h-10 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-black flex items-center justify-center border border-slate-200 active:scale-95 shrink-0"
                          aria-label="Diminuir peças repostas"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={item.qtdReposta}
                          onChange={(e) => handleUpdateItem(item.produtoId, 'qtdReposta', Number(e.target.value))}
                          className={`flex-1 h-10 text-center font-bold rounded-xl outline-none border ${
                            temFalta
                              ? 'border-rose-400 bg-rose-100 text-rose-950 font-black'
                              : 'border-slate-300 text-teal-800 focus:ring-2 focus:ring-teal-500'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => handleStepReposta(item.produtoId, 1)}
                          className="w-10 h-10 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 font-black flex items-center justify-center border border-slate-200 active:scale-95 shrink-0"
                          aria-label="Aumentar peças repostas"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Alerta Específico deste Item */}
                      {temFalta && (
                        <div className="flex items-center justify-between pt-1 text-[11px] text-rose-700 font-bold border-t border-rose-200">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            Faltam {faltaQtd} un no Ateliê!
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetMaxReposta(item.produtoId, estoqueDisp)}
                            className="underline text-rose-900 text-[10px]"
                          >
                            Usar máx ({estoqueDisp} un)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Modelo 3D</th>
                    <th className="p-3 text-center">Tinha</th>
                    <th className="p-3 text-center">Sobrou no Display</th>
                    <th className="p-3 text-center">Vendidos</th>
                    <th className="p-3 text-center">Estoque Ateliê</th>
                    <th className="p-3 text-center">Repor +Peças</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsConferencia.map((item) => {
                    const prod = produtos.find(p => p.id === item.produtoId);
                    if (!prod) return null;
                    const vendidas = Math.max(0, item.qtdAnterior - item.qtdRestante);
                    const estoqueDisp = prod.estoqueAtelie;
                    const temFalta = item.qtdReposta > estoqueDisp;
                    const faltaQtd = item.qtdReposta - estoqueDisp;

                    return (
                      <tr key={item.produtoId} className={`hover:bg-slate-50/70 ${temFalta ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {prod.fotoUrl ? (
                              <img
                                src={prod.fotoUrl}
                                alt={prod.nome}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 leading-tight block">
                                {prod.nome}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {prod.codigo && (
                                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {prod.codigo}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Preço: {formatCurrency(prod.precoVenda)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-center font-bold text-slate-600">
                          {item.qtdAnterior}
                        </td>

                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.qtdAnterior}
                            value={item.qtdRestante}
                            onChange={(e) => handleUpdateItem(item.produtoId, 'qtdRestante', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </td>

                        <td className="p-3 text-center font-black text-emerald-600">
                          {vendidas} un.
                        </td>

                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full border text-[10px] ${
                            estoqueDisp === 0
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : estoqueDisp <= 3
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {estoqueDisp} un
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={item.qtdReposta}
                                onChange={(e) => handleUpdateItem(item.produtoId, 'qtdReposta', Number(e.target.value))}
                                className={`w-16 px-2 py-1 text-center font-bold rounded-lg border outline-none ${
                                  temFalta
                                    ? 'border-rose-400 bg-rose-100 text-rose-950 font-black'
                                    : 'border-slate-300 text-teal-700 focus:ring-2 focus:ring-teal-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleSetMaxReposta(item.produtoId, estoqueDisp)}
                                className="px-1.5 py-1 text-[10px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-md"
                                title="Preencher com máximo disponível no ateliê"
                              >
                                Máx
                              </button>
                            </div>
                            {temFalta && (
                              <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Falta {faltaQtd} un
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right font-black text-slate-900">
                          {formatCurrency(vendidas * prod.precoVenda)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Totais e Fechamento Financeiro */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Total de Peças Vendidas:</span>
              <strong className="text-slate-900 text-xs sm:text-sm">{totalPecasVendidas} unidades</strong>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Venda Total Bruta:</span>
              <strong className="text-slate-900 text-xs sm:text-sm">{formatCurrency(valorBrutoVendido)}</strong>
            </div>

            <div className="flex justify-between text-blue-700">
              <span>Comissão da Loja ({pdv ? pdv.comissaoLojaPorcentagem : 30}%):</span>
              <strong>- {formatCurrency(comissaoLojaValor)}</strong>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-black text-sm sm:text-base">
              <span>LÍQUIDO A REPASSAR LM3D:</span>
              <span className="text-emerald-600">{formatCurrency(valorLiquidoLM3D)}</span>
            </div>

            <div className="flex justify-between text-teal-700 text-[11px] sm:text-xs font-bold">
              <span>Lucro Real LM3D (após custo de filamento e argolas):</span>
              <span>+{formatCurrency(lucroLiquidoLM3D)}</span>
            </div>
          </div>

          {/* 4. Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Forma de Recebimento
              </label>
              <select
                value={statusPagamento}
                onChange={(e) => setStatusPagamento(e.target.value as StatusPagamentoAcerto)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="pago_pix">Pago via PIX</option>
                <option value="pago_dinheiro">Pago em Dinheiro</option>
                <option value="pago_cartao">Pago no Cartão</option>
                <option value="pendente_a_receber">A Receber (Promissória)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações da Visita
              </label>
              <input
                type="text"
                placeholder="Ex: Pediu mais chaveiros de moto para a próxima..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* Desktop Footer Actions */}
          <div className="hidden sm:flex pt-4 border-t border-slate-200 items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Finalizar Acerto & Atualizar Estoque
            </button>
          </div>

          {/* Sticky Mobile Summary & Finalize Action Bar */}
          <div className="sm:hidden sticky -bottom-4 -mx-4 px-4 py-3 bg-slate-900 text-white border-t border-slate-800 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">Líquido LM3D</span>
              <strong className="text-base font-black text-emerald-400 leading-tight">
                {formatCurrency(valorLiquidoLM3D)}
              </strong>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              Finalizar Acerto
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
