import React, { useMemo } from 'react';
import { PontoDeVenda, Produto3D, FechamentoAcerto } from '../types';
import { formatCurrency, formatPercent, getCategoriaLabel } from '../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  Store, 
  Package, 
  DollarSign, 
  Layers, 
  Award, 
  Download, 
  RotateCcw, 
  Sparkles,
  PieChart,
  Boxes,
  ClipboardCheck,
  ArrowRight
} from 'lucide-react';

interface DashboardTabProps {
  pdvs: PontoDeVenda[];
  produtos: Produto3D[];
  acertos: FechamentoAcerto[];
  onResetData: () => void;
  onOpenInventario?: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  pdvs,
  produtos,
  acertos,
  onResetData,
  onOpenInventario,
}) => {
  // Metrics calculation
  const metrics = useMemo(() => {
    const totalPecasRua = pdvs.reduce((acc, p) => acc + p.totalPecasNoDisplay, 0);
    const totalValorConsignadoRua = pdvs.reduce((acc, p) => acc + p.valorTotalConsignado, 0);
    const totalEstoqueAtelie = produtos.reduce((acc, p) => acc + p.estoqueAtelie, 0);

    const faturamentoBrutoTotal = acertos.reduce((acc, a) => acc + a.valorBrutoVendido, 0);
    const repasseLiquidoLM3D = acertos.reduce((acc, a) => acc + a.valorLiquidoLM3D, 0);
    const comissaoPagaLojas = acertos.reduce((acc, a) => acc + a.comissaoLojaValor, 0);
    const lucroLiquidoLM3D = acertos.reduce((acc, a) => acc + a.lucroLiquidoLM3D, 0);
    const totalPecasVendidas = acertos.reduce((acc, a) => acc + a.totalPecasVendidas, 0);

    // Sales by product
    const vendasPorProdutoMap: Record<string, { nome: string; categoria: string; qtd: number; total: number }> = {};
    acertos.forEach(a => {
      a.itens.forEach(item => {
        if (!vendasPorProdutoMap[item.produtoNome]) {
          vendasPorProdutoMap[item.produtoNome] = {
            nome: item.produtoNome,
            categoria: item.categoria,
            qtd: 0,
            total: 0,
          };
        }
        vendasPorProdutoMap[item.produtoNome].qtd += item.qtdVendida;
        vendasPorProdutoMap[item.produtoNome].total += item.subtotalVendido;
      });
    });

    const topProdutos = Object.values(vendasPorProdutoMap).sort((a, b) => b.qtd - a.qtd);

    // Top Stores
    const topLojas = [...pdvs].sort((a, b) => b.totalVendidoAcumulado - a.totalVendidoAcumulado);

    return {
      totalPecasRua,
      totalValorConsignadoRua,
      totalEstoqueAtelie,
      faturamentoBrutoTotal,
      repasseLiquidoLM3D,
      comissaoPagaLojas,
      lucroLiquidoLM3D,
      totalPecasVendidas,
      topProdutos,
      topLojas,
    };
  }, [pdvs, produtos, acertos]);

  const handleExportJSON = () => {
    const backup = {
      pdvs,
      produtos,
      acertos,
      dataExport: new Date().toISOString(),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lm3d-consignados-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-3 border border-teal-500/30">
            <BarChart3 className="w-3.5 h-3.5" />
            Visão Geral do Negócio
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Produção & Faturamento LM3D
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Acompanhamento de estoque na rua, faturamento das lojas parceiras, lucratividade líquida da impressão 3D e desempenho por produto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            Backup JSON
          </button>
          <button
            type="button"
            onClick={onResetData}
            title="Restaurar dados padrão"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            Restaurar Base
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block">Chaveiros nos Displays</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {metrics.totalPecasRua} unidades
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {formatCurrency(metrics.totalValorConsignadoRua)} em mercadoria
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-blue-700 block">Venda Total Acumulada</span>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {formatCurrency(metrics.faturamentoBrutoTotal)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {metrics.totalPecasVendidas} peças vendidas nos PDVs
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 block">Líquido Arrecadado LM3D</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(metrics.repasseLiquidoLM3D)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Lojas retiveram {formatCurrency(metrics.comissaoPagaLojas)} em comissão
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold text-teal-700 block">LUCRO LÍQUIDO REAL</span>
          <div className="text-2xl font-black text-teal-600 mt-1">
            +{formatCurrency(metrics.lucroLiquidoLM3D)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Livre de filamento, energia e ferragens
          </span>
        </div>
      </div>

      {/* Estoque do Ateliê & Ação Rápida de Inventário */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-teal-800/40 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-black shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wide">
                Estoque Pronto no Ateliê
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-400/20 text-teal-200 border border-teal-400/30">
                {metrics.totalEstoqueAtelie} peças disponíveis
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Peças prontas na oficina prontas para abastecer os expositores e rotas de entrega.
            </p>
          </div>
        </div>

        {onOpenInventario && (
          <button
            type="button"
            onClick={onOpenInventario}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
          >
            <ClipboardCheck className="w-4 h-4" />
            Fazer Inventário / Balanço
          </button>
        )}
      </div>

      {/* Grid: Top Produtos vs Top Lojas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Produtos 3D Mais Vendidos */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Chaveiros & Modelos 3D Campeões de Venda
            </h3>
            <span className="text-xs text-slate-400">Por unidades vendidas</span>
          </div>

          <div className="space-y-3 pt-1">
            {metrics.topProdutos.length > 0 ? (
              metrics.topProdutos.slice(0, 6).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[11px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <strong className="text-slate-900 font-bold block">{item.nome}</strong>
                      <span className="text-[10px] text-slate-400">{item.qtd} unidades vendidas</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 block">
                      {formatCurrency(item.total)}
                    </span>
                    <span className="text-[10px] text-slate-400">em vendas brutas</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma venda registrada ainda.</p>
            )}
          </div>
        </div>

        {/* Top Pontos de Venda */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-4 h-4 text-teal-600" />
              Lojas Parceiras Mais Lucrativas
            </h3>
            <span className="text-xs text-slate-400">Por volume faturado</span>
          </div>

          <div className="space-y-3 pt-1">
            {metrics.topLojas.map((pdv, idx) => (
              <div key={pdv.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-[11px]">
                    #{idx + 1}
                  </span>
                  <div>
                    <strong className="text-slate-900 font-bold block">{pdv.nomeLoja}</strong>
                    <span className="text-[10px] text-slate-400">
                      {pdv.responsavel} • {pdv.totalPecasNoDisplay} peças no display
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-slate-900 block">
                    {formatCurrency(pdv.totalVendidoAcumulado)}
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    Comissão {pdv.comissaoLojaPorcentagem}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
