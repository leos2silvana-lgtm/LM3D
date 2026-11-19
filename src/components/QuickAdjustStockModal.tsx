import React, { useState, useEffect } from 'react';
import { Produto3D, MotivoAjusteEstoque } from '../types';
import { formatCurrency, formatProductCode } from '../utils/formatters';
import { 
  X, 
  Check, 
  Package, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Sparkles, 
  Flame, 
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface QuickAdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto3D | null;
  onSave: (produtoId: string, novoEstoque: number, motivo: MotivoAjusteEstoque, observacao?: string) => void;
}

export const QuickAdjustStockModal: React.FC<QuickAdjustStockModalProps> = ({
  isOpen,
  onClose,
  produto,
  onSave,
}) => {
  if (!isOpen || !produto) return null;

  const [novoEstoque, setNovoEstoque] = useState<number>(produto.estoqueAtelie);
  const [motivo, setMotivo] = useState<MotivoAjusteEstoque>('producao_concluida');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (produto) {
      setNovoEstoque(produto.estoqueAtelie);
      setMotivo('producao_concluida');
      setObservacao('');
    }
  }, [produto]);

  const diferenca = novoEstoque - produto.estoqueAtelie;

  const handleApplyDelta = (delta: number) => {
    setNovoEstoque(prev => Math.max(0, prev + delta));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(produto.id, novoEstoque, motivo, observacao.trim() || undefined);
    onClose();
  };

  const prodCode = formatProductCode(produto);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Ajustar Estoque no Ateliê
              </h3>
              <p className="text-xs text-slate-400">
                Atualize o saldo de peças prontas para reposição
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

        {/* Product Card Highlight */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center gap-3.5">
          {produto.fotoUrl ? (
            <img
              src={produto.fotoUrl}
              alt={produto.nome}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500 shrink-0">
              <Package className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-300">
                {prodCode}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate">
                Preço: {formatCurrency(produto.precoVenda)}
              </span>
            </div>
            <h4 className="text-sm font-black text-slate-900 leading-tight mt-0.5 truncate">
              {produto.nome}
            </h4>
            <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
              <span>
                Ateliê Atual: <strong className="text-teal-700 font-black">{produto.estoqueAtelie} un.</strong>
              </span>
              <span>
                Consignado: <strong className="text-slate-800 font-bold">{produto.totalConsignado} un.</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-slate-800">
          
          {/* New Stock Input & Increments */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
              Novo Saldo de Estoque (Físico no Ateliê)
            </label>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleApplyDelta(-5)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs active:scale-95 transition-all"
                title="Subtrair 5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(-1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold active:scale-95 transition-all"
                title="Subtrair 1"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="0"
                value={novoEstoque}
                onChange={(e) => setNovoEstoque(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-center text-2xl font-black text-slate-900 border-2 border-teal-500 rounded-2xl py-2 outline-none focus:ring-4 focus:ring-teal-500/20 shadow-inner"
              />

              <button
                type="button"
                onClick={() => handleApplyDelta(1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold active:scale-95 transition-all"
                title="Adicionar 1"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(5)}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs active:scale-95 transition-all"
                title="Adicionar 5"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => handleApplyDelta(10)}
                className="px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs active:scale-95 transition-all border border-teal-200"
                title="Adicionar 10 (Lote impresso)"
              >
                +10
              </button>
            </div>

            {/* Difference Badge */}
            <div className="pt-2 flex items-center justify-center gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Anterior: {produto.estoqueAtelie} un</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-900 font-bold">Novo: {novoEstoque} un</span>
              </div>

              {diferenca === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Sem alteração
                </span>
              ) : diferenca > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  +{diferenca} novas peças
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <Minus className="w-3 h-3" />
                  {diferenca} peças
                </span>
              )}
            </div>
          </div>

          {/* Motivo do Ajuste */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Motivo do Ajuste *
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoAjusteEstoque)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium bg-white"
            >
              <option value="producao_concluida">Produção Finalizada na Impressora 3D (+)</option>
              <option value="contagem_inventario">Balanço / Inventário Físico do Ateliê</option>
              <option value="perda_defeito">Perda / Peça com Defeito / Teste Fatiador (-)</option>
              <option value="venda_direta_atelie">Venda Direta no Ateliê / Encomenda (-)</option>
              <option value="ajuste_manual">Ajuste Manual / Correção de Saldo</option>
            </select>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observação / Detalhes (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Lote de 10 chaveiros pretos e prateados impresso ontem"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* Quick Buttons for common actions */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Atalhos rápidos:</span>
            <button
              type="button"
              onClick={() => {
                setNovoEstoque(produto.estoqueAtelie + 10);
                setMotivo('producao_concluida');
              }}
              className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
            >
              +10 Lote Impresso
            </button>
            <button
              type="button"
              onClick={() => {
                setNovoEstoque(Math.max(0, produto.estoqueAtelie - 1));
                setMotivo('perda_defeito');
              }}
              className="px-2 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200"
            >
              -1 Defeito/Refugo
            </button>
            <button
              type="button"
              onClick={() => setNovoEstoque(produto.estoqueAtelie)}
              className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar
            </button>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={diferenca === 0}
              className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                diferenca === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950'
              }`}
            >
              <Check className="w-4 h-4" />
              Confirmar Ajuste ({diferenca > 0 ? `+${diferenca}` : diferenca} un.)
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
