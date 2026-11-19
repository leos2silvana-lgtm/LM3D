import React, { useState, useMemo } from 'react';
import { Produto3D, ItemInventario, RegistroInventario } from '../types';
import { formatCurrency, formatProductCode, normalizeSearch, getCategoriaLabel } from '../utils/formatters';
import { 
  X, 
  Check, 
  ClipboardCheck, 
  Search, 
  Plus, 
  Minus, 
  AlertTriangle, 
  RotateCcw, 
  Copy, 
  SlidersHorizontal,
  Boxes,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: Produto3D[];
  onApplyInventory: (
    ajustes: { produtoId: string; novoEstoque: number; diferenca: number }[],
    motivo: string,
    observacao?: string
  ) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  produtos,
  onApplyInventory,
}) => {
  if (!isOpen) return null;

  // Map of counts: produtoId -> counted physical stock
  const [contagens, setContagens] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    produtos.forEach(p => {
      initial[p.id] = p.estoqueAtelie; // Default initially matched to system
    });
    return initial;
  });

  const [busca, setBusca] = useState('');
  const [apenasDivergentes, setApenasDivergentes] = useState(false);
  const [motivo, setMotivo] = useState('Inventário Físico Periódico');
  const [observacoes, setObservacoes] = useState('');
  const [confirmarModal, setConfirmarModal] = useState(false);

  // Update a single item count
  const handleUpdateContagem = (produtoId: string, valor: number) => {
    setContagens(prev => ({
      ...prev,
      [produtoId]: Math.max(0, valor)
    }));
  };

  const handleApplyDelta = (produtoId: string, delta: number) => {
    setContagens(prev => {
      const atual = prev[produtoId] ?? 0;
      return {
        ...prev,
        [produtoId]: Math.max(0, atual + delta)
      };
    });
  };

  // Bulk actions
  const handleResetToSystem = () => {
    const reset: Record<string, number> = {};
    produtos.forEach(p => {
      reset[p.id] = p.estoqueAtelie;
    });
    setContagens(reset);
  };

  const handleZeroAll = () => {
    const zeros: Record<string, number> = {};
    produtos.forEach(p => {
      zeros[p.id] = 0;
    });
    setContagens(zeros);
  };

  // Calculations
  const queryNorm = normalizeSearch(busca);

  const listaItens = useMemo(() => {
    return produtos.map(prod => {
      const contado = contagens[prod.id] ?? prod.estoqueAtelie;
      const diferenca = contado - prod.estoqueAtelie;
      const temDivergencia = diferenca !== 0;

      return {
        prod,
        contado,
        diferenca,
        temDivergencia,
      };
    });
  }, [produtos, contagens]);

  const itensFiltrados = useMemo(() => {
    return listaItens.filter(item => {
      if (apenasDivergentes && !item.temDivergencia) {
        return false;
      }

      if (queryNorm) {
        const code = formatProductCode(item.prod);
        const matchName = normalizeSearch(item.prod.nome).includes(queryNorm);
        const matchCode = normalizeSearch(item.prod.codigo || '').includes(queryNorm) || 
                          normalizeSearch(code).includes(queryNorm);
        const matchCat = normalizeSearch(item.prod.categoria).includes(queryNorm);

        if (!matchName && !matchCode && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [listaItens, apenasDivergentes, queryNorm]);

  // Overall Statistics
  const estatisticas = useMemo(() => {
    let totalSistema = 0;
    let totalFisico = 0;
    let totalItensComDivergencia = 0;
    let pecasSobrando = 0;
    let pecasFaltando = 0;
    let impactoValorVenda = 0;
    let impactoCusto = 0;

    listaItens.forEach(({ prod, contado, diferenca }) => {
      totalSistema += prod.estoqueAtelie;
      totalFisico += contado;

      if (diferenca !== 0) {
        totalItensComDivergencia++;
        if (diferenca > 0) {
          pecasSobrando += diferenca;
        } else {
          pecasFaltando += Math.abs(diferenca);
        }
        impactoValorVenda += diferenca * prod.precoVenda;
        impactoCusto += diferenca * prod.custoProducao;
      }
    });

    const saldoLiquidoPecas = totalFisico - totalSistema;

    return {
      totalSistema,
      totalFisico,
      totalItensComDivergencia,
      pecasSobrando,
      pecasFaltando,
      saldoLiquidoPecas,
      impactoValorVenda,
      impactoCusto,
    };
  }, [listaItens]);

  // Handle final submission
  const handleFinalSubmit = () => {
    const ajustes = listaItens
      .filter(i => i.temDivergencia)
      .map(i => ({
        produtoId: i.prod.id,
        novoEstoque: i.contado,
        diferenca: i.diferenca,
      }));

    onApplyInventory(ajustes, motivo, observacoes.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  Balanço & Inventário do Ateliê
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Ajuste de Diferenças
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Faça a contagem física das peças prontas e sincronize o estoque do sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Analytics & Metrics Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">Estoque no Sistema</span>
            <strong className="text-sm sm:text-base font-black text-slate-800">
              {estatisticas.totalSistema} <span className="text-xs font-normal text-slate-400">peças</span>
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-teal-700 block text-[11px] font-medium">Contagem Física</span>
            <strong className="text-sm sm:text-base font-black text-teal-600">
              {estatisticas.totalFisico} <span className="text-xs font-normal text-slate-400">peças</span>
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">Itens c/ Divergência</span>
            <strong className={`text-sm sm:text-base font-black ${
              estatisticas.totalItensComDivergencia > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {estatisticas.totalItensComDivergencia} <span className="text-xs font-normal text-slate-400">modelos</span>
            </strong>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">Saldo Líquido</span>
            <div className="flex items-center gap-1">
              <strong className={`text-sm sm:text-base font-black ${
                estatisticas.saldoLiquidoPecas > 0
                  ? 'text-emerald-600'
                  : estatisticas.saldoLiquidoPecas < 0
                  ? 'text-rose-600'
                  : 'text-slate-800'
              }`}>
                {estatisticas.saldoLiquidoPecas > 0 ? `+${estatisticas.saldoLiquidoPecas}` : estatisticas.saldoLiquidoPecas} pecas
              </strong>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou código para contar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setApenasDivergentes(!apenasDivergentes)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                apenasDivergentes
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Apenas Divergências ({estatisticas.totalItensComDivergencia})
            </button>

            <button
              type="button"
              onClick={handleResetToSystem}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
              title="Copia os valores atuais do sistema para as contagens"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Igualar ao Sistema
            </button>
          </div>
        </div>

        {/* Product Items Table / List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
          {itensFiltrados.length === 0 ? (
            <div className="p-10 text-center text-slate-500 space-y-2">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhum produto encontrado</p>
              <p className="text-xs text-slate-400">
                {apenasDivergentes
                  ? 'Não há produtos com diferenças de contagem no filtro atual.'
                  : 'Verifique a busca digitada.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {itensFiltrados.map(({ prod, contado, diferenca, temDivergencia }) => {
                const prodCode = formatProductCode(prod);

                return (
                  <div
                    key={prod.id}
                    className={`p-3.5 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                      temDivergencia ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {prod.fotoUrl ? (
                        <img
                          src={prod.fotoUrl}
                          alt={prod.nome}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <Boxes className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {prodCode}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {prod.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>
                            Sistema: <strong className="text-slate-800 font-bold">{prod.estoqueAtelie} un</strong>
                          </span>
                          <span>•</span>
                          <span>Preço: {formatCurrency(prod.precoVenda)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Counter Controls & Difference */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-14 sm:pl-0">
                      {/* Interactive Counter */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleApplyDelta(prod.id, -5)}
                          className="px-1.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg active:scale-95"
                          title="Subtrair 5"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDelta(prod.id, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                          title="Subtrair 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={contado}
                          onChange={(e) => handleUpdateContagem(prod.id, Number(e.target.value))}
                          className={`w-14 text-center font-black text-sm py-1 border rounded-lg outline-none transition-all ${
                            temDivergencia
                              ? 'border-amber-400 bg-amber-50/60 text-slate-950 font-black'
                              : 'border-slate-300 text-slate-900 focus:border-teal-500'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => handleApplyDelta(prod.id, 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                          title="Adicionar 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDelta(prod.id, 5)}
                          className="px-1.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg active:scale-95"
                          title="Adicionar 5"
                        >
                          +5
                        </button>
                      </div>

                      {/* Difference Badge */}
                      <div className="min-w-[105px] text-right">
                        {diferenca === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Exato (0)
                          </span>
                        ) : diferenca > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            <TrendingUp className="w-3 h-3 text-blue-600" />
                            +{diferenca} sobra
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <TrendingDown className="w-3 h-3 text-rose-600" />
                            {diferenca} falta
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Notes & Confirmation */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo do Balanço
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
              >
                <option value="Inventário Físico Periódico">Inventário Físico Periódico</option>
                <option value="Auditoria Geral de Estoque">Auditoria Geral de Estoque</option>
                <option value="Ajuste Pós-Produção e Encomendas">Ajuste Pós-Produção e Encomendas</option>
                <option value="Correção de Quebras e Defeitos">Correção de Quebras e Defeitos</option>
                <option value="Outro">Outro Motivo</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações do Balanço
              </label>
              <input
                type="text"
                placeholder="Ex: Contagem realizada após limpeza e conferência das gavetas..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              {estatisticas.totalItensComDivergencia === 0 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Nenhuma divergência identificada (estoque físico 100% alinhado ao sistema).
                </span>
              ) : (
                <span>
                  Serão corrigidos <strong className="text-slate-900">{estatisticas.totalItensComDivergencia} produtos</strong> com divergência (saldo líquido: <strong className={estatisticas.saldoLiquidoPecas >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{estatisticas.saldoLiquidoPecas > 0 ? `+${estatisticas.saldoLiquidoPecas}` : estatisticas.saldoLiquidoPecas} peças</strong>).
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={estatisticas.totalItensComDivergencia === 0}
                className={`w-full sm:w-auto px-5 py-2.5 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                  estatisticas.totalItensComDivergencia === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950'
                }`}
              >
                <Check className="w-4 h-4" />
                Aplicar e Corrigir Estoque ({estatisticas.totalItensComDivergencia} itens)
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
