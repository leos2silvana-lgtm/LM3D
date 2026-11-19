import React, { useMemo, useState } from 'react';
import { ConfiguracaoCalculadora3D, PontoDeVenda, Produto3D } from '../types';
import {
  calculate3DCost,
  formatCurrency,
  formatProductCode,
  getCategoriaLabel,
} from '../utils/formatters';
import {
  Calculator,
  Weight,
  Tag,
  TrendingUp,
  Store,
  DollarSign,
  Printer,
  Package,
  Boxes,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';

interface Calculator3DTabProps {
  produtos: Produto3D[];
  pdvs: PontoDeVenda[];
}

type TipoAcabamentoPreset = 'peca_avulsa' | 'chaveiro' | 'suporte_miniatura';

export const Calculator3DTab: React.FC<Calculator3DTabProps> = ({
  produtos,
  pdvs,
}) => {
  const [config, setConfig] = useState<ConfiguracaoCalculadora3D>({
    precoFilamentoKg: 85.0,
    pesoGramas: 14,
    tempoMinutos: 25,
    potenciaWatts: 150,
    tarifaKwh: 0.95,
    custoArgolaCorrente: 0.0,
    custoEmbalagemTag: 0.35,
    precoVendaConsumidor: 15.0,
    comissaoLojistaPorcento: 30,
  });

  const [selectedProdutoId, setSelectedProdutoId] = useState<string>('manual');
  const [selectedPdvId, setSelectedPdvId] = useState<string>('padrao');
  const [acabamentoPreset, setAcabamentoPreset] =
    useState<TipoAcabamentoPreset>('peca_avulsa');
  const [escalaPecasMes, setEscalaPecasMes] = useState<number>(300);
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'atelie' | 'rua'>('todos');

  // Resumo real e concreto do estoque (Ateliê + PDVs + Peças Avulsas)
  const resumoEstoque = useMemo(() => {
    let totalAtelieUn = 0;
    let totalAteliePesoG = 0;
    let totalAtelieTempoMin = 0;
    let totalAtelieCusto = 0;
    let totalAtelieValorVenda = 0;

    let totalConsignadoProdutosUn = 0;
    let totalConsignadoProdutosValor = 0;

    produtos.forEach((p) => {
      const qAtelie = Math.max(0, p.estoqueAtelie || 0);
      const qConsig = Math.max(0, p.totalConsignado || 0);
      totalAtelieUn += qAtelie;
      totalAteliePesoG += qAtelie * (p.pesoGramas || 0);
      totalAtelieTempoMin += qAtelie * (p.tempoImpressaoMin || 0);
      totalAtelieCusto += qAtelie * (p.custoProducao || 0);
      totalAtelieValorVenda += qAtelie * (p.precoVenda || 0);

      totalConsignadoProdutosUn += qConsig;
      totalConsignadoProdutosValor += qConsig * (p.precoVenda || 0);
    });

    // Estoque nos PDVs reais (expositores + peças avulsas)
    let totalRuaPdvUn = 0;
    let totalRuaPdvValorBruto = 0;
    let totalRuaPecasAvulsasUn = 0;
    let totalRuaLiquidoLM3D = 0;
    let somaComissoes = 0;

    pdvs.forEach((pdv) => {
      const un = Math.max(0, pdv.totalPecasNoDisplay || 0);
      const val = Math.max(0, pdv.valorTotalConsignado || 0);
      const comissao = pdv.comissaoLojaPorcentagem || 30;
      totalRuaPdvUn += un;
      totalRuaPdvValorBruto += val;
      totalRuaLiquidoLM3D += val * (1 - comissao / 100);
      somaComissoes += comissao;

      const avulsasLista = (pdv.itensPecasAvulsas || []).reduce(
        (acc, item) => acc + Math.max(0, item.quantidade || 0),
        0
      );
      if (avulsasLista > 0) {
        totalRuaPecasAvulsasUn += avulsasLista;
      } else if (pdv.tipoExpositor === 'sem_display_pecas') {
        totalRuaPecasAvulsasUn += un;
      } else if (pdv.temPecasAvulsas && (pdv.quantidadePecasAvulsas || 0) > 0) {
        totalRuaPecasAvulsasUn += pdv.quantidadePecasAvulsas || 0;
      }
    });

    const totalRuaUn = totalRuaPdvUn > 0 ? totalRuaPdvUn : totalConsignadoProdutosUn;
    const totalRuaValor =
      totalRuaPdvValorBruto > 0 ? totalRuaPdvValorBruto : totalConsignadoProdutosValor;
    const comissaoMediaPdvs =
      pdvs.length > 0 ? somaComissoes / pdvs.length : config.comissaoLojistaPorcento;
    const totalRuaLiquidoEstimado =
      totalRuaPdvUn > 0
        ? totalRuaLiquidoLM3D
        : totalRuaValor * (1 - comissaoMediaPdvs / 100);

    // Média ponderada por produto cadastrado
    const totalUnidadesCatalogo = totalAtelieUn + totalConsignadoProdutosUn;
    const pesoMedioG =
      produtos.length > 0
        ? produtos.reduce((acc, p) => acc + (p.pesoGramas || 0), 0) / produtos.length
        : config.pesoGramas;
    const tempoMedioMin =
      produtos.length > 0
        ? produtos.reduce((acc, p) => acc + (p.tempoImpressaoMin || 0), 0) / produtos.length
        : config.tempoMinutos;
    const precoMedioVenda =
      produtos.length > 0
        ? produtos.reduce((acc, p) => acc + (p.precoVenda || 0), 0) / produtos.length
        : config.precoVendaConsumidor;

    // Resumo por categoria do catálogo
    const porCategoriaMap = new Map<
      string,
      {
        categoria: string;
        label: string;
        modelos: number;
        atelieUn: number;
        consignadoUn: number;
        pesoTotalG: number;
        valorVendaPotencial: number;
      }
    >();

    produtos.forEach((p) => {
      const catInfo = getCategoriaLabel(p.categoria);
      const current = porCategoriaMap.get(p.categoria) || {
        categoria: p.categoria,
        label: catInfo.label,
        modelos: 0,
        atelieUn: 0,
        consignadoUn: 0,
        pesoTotalG: 0,
        valorVendaPotencial: 0,
      };
      const totalUnItem = (p.estoqueAtelie || 0) + (p.totalConsignado || 0);
      current.modelos += 1;
      current.atelieUn += p.estoqueAtelie || 0;
      current.consignadoUn += p.totalConsignado || 0;
      current.pesoTotalG += (p.estoqueAtelie || 0) * (p.pesoGramas || 0);
      current.valorVendaPotencial += totalUnItem * (p.precoVenda || 0);
      porCategoriaMap.set(p.categoria, current);
    });

    const totalGeralUn = totalAtelieUn + totalRuaUn;
    const valorBrutoTotalEstoque = totalAtelieValorVenda + totalRuaValor;
    const liquidoAtelieComComissaoAtual =
      totalAtelieValorVenda * (1 - (config.comissaoLojistaPorcento || 0) / 100);
    const lucroEstimadoAtelie = liquidoAtelieComComissaoAtual - totalAtelieCusto;

    return {
      totalAtelieUn,
      totalAteliePesoG,
      totalAtelieTempoMin,
      totalAtelieCusto,
      totalAtelieValorVenda,
      totalRuaUn,
      totalRuaValor,
      totalRuaLiquidoEstimado,
      totalRuaPecasAvulsasUn,
      comissaoMediaPdvs,
      totalGeralUn,
      valorBrutoTotalEstoque,
      liquidoAtelieComComissaoAtual,
      lucroEstimadoAtelie,
      pesoMedioG,
      tempoMedioMin,
      precoMedioVenda,
      totalUnidadesCatalogo,
      porCategoria: Array.from(porCategoriaMap.values()).sort(
        (a, b) => b.atelieUn + b.consignadoUn - (a.atelieUn + a.consignadoUn)
      ),
    };
  }, [produtos, pdvs, config.comissaoLojistaPorcento, config.pesoGramas, config.tempoMinutos, config.precoVendaConsumidor]);

  const resultado = calculate3DCost(config);
  const selectedProduto = produtos.find((p) => p.id === selectedProdutoId) || null;
  const selectedPdv = pdvs.find((p) => p.id === selectedPdvId) || null;

  // Rendimento concreto por carretel (1 kg = 1.000g)
  const pecasPorCarretel =
    config.pesoGramas > 0 ? Math.floor(1000 / config.pesoGramas) : 0;
  const horasImpressaoCarretel =
    pecasPorCarretel > 0 ? (pecasPorCarretel * config.tempoMinutos) / 60 : 0;
  const lucroPorCarretel = pecasPorCarretel * resultado.lucroLiquidoLM3D;

  // Simulação de lote / escala mensal
  const faturamentoBrutoEscala = escalaPecasMes * config.precoVendaConsumidor;
  const comissaoLojasEscala = escalaPecasMes * resultado.comissaoLojaValor;
  const liquidoLM3DEscala = escalaPecasMes * resultado.valorLiquidoLM3D;
  const custoTotalEscala = escalaPecasMes * resultado.custoTotalProducao;
  const lucroLiquidoEscala = escalaPecasMes * resultado.lucroLiquidoLM3D;
  const filamentoNecessarioKg = (escalaPecasMes * (config.pesoGramas || 0)) / 1000;
  const horasTotaisImpressao = (escalaPecasMes * (config.tempoMinutos || 0)) / 60;

  const handleSelectProduto = (produtoId: string) => {
    setSelectedProdutoId(produtoId);
    if (produtoId === 'manual') return;
    const prod = produtos.find((p) => p.id === produtoId);
    if (!prod) return;

    const isChaveiro = prod.categoria.startsWith('chaveiro_');
    setAcabamentoPreset(isChaveiro ? 'chaveiro' : 'peca_avulsa');
    setConfig((prev) => ({
      ...prev,
      pesoGramas: prod.pesoGramas > 0 ? prod.pesoGramas : prev.pesoGramas,
      tempoMinutos: prod.tempoImpressaoMin > 0 ? prod.tempoImpressaoMin : prev.tempoMinutos,
      precoVendaConsumidor: prod.precoVenda > 0 ? prod.precoVenda : prev.precoVendaConsumidor,
      custoArgolaCorrente: isChaveiro ? 0.8 : 0.0,
      custoEmbalagemTag: isChaveiro ? 0.45 : 0.25,
    }));
  };

  const handleSelectPdv = (pdvId: string) => {
    setSelectedPdvId(pdvId);
    if (pdvId === 'padrao') return;
    const pdv = pdvs.find((p) => p.id === pdvId);
    if (!pdv) return;
    setConfig((prev) => ({
      ...prev,
      comissaoLojistaPorcento: pdv.comissaoLojaPorcentagem,
    }));
  };

  const handleApplyPreset = (preset: TipoAcabamentoPreset) => {
    setAcabamentoPreset(preset);
    if (preset === 'peca_avulsa') {
      setConfig((prev) => ({
        ...prev,
        custoArgolaCorrente: 0.0,
        custoEmbalagemTag: 0.25,
      }));
    } else if (preset === 'chaveiro') {
      setConfig((prev) => ({
        ...prev,
        custoArgolaCorrente: 0.8,
        custoEmbalagemTag: 0.45,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        custoArgolaCorrente: 0.0,
        custoEmbalagemTag: 0.6,
      }));
    }
  };

  const handleAplicarMediaCatalogo = () => {
    setSelectedProdutoId('manual');
    setConfig((prev) => ({
      ...prev,
      pesoGramas: Number(resumoEstoque.pesoMedioG.toFixed(1)) || prev.pesoGramas,
      tempoMinutos: Math.round(resumoEstoque.tempoMedioMin) || prev.tempoMinutos,
      precoVendaConsumidor:
        Number(resumoEstoque.precoMedioVenda.toFixed(2)) || prev.precoVendaConsumidor,
      comissaoLojistaPorcento: Math.round(resumoEstoque.comissaoMediaPdvs) || prev.comissaoLojistaPorcento,
    }));
  };

  const produtosFiltradosEstoque = useMemo(() => {
    return produtos
      .filter((p) => {
        if (filtroEstoque === 'atelie') return (p.estoqueAtelie || 0) > 0;
        if (filtroEstoque === 'rua') return (p.totalConsignado || 0) > 0;
        return true;
      })
      .sort(
        (a, b) =>
          (b.estoqueAtelie || 0) +
          (b.totalConsignado || 0) -
          ((a.estoqueAtelie || 0) + (a.totalConsignado || 0))
      );
  }, [produtos, filtroEstoque]);

  const safePrecoVenda = config.precoVendaConsumidor > 0 ? config.precoVendaConsumidor : 1;
  const pctCusto = Math.max(0, Math.min(100, (resultado.custoTotalProducao / safePrecoVenda) * 100));
  const pctLoja = Math.max(0, Math.min(100 - pctCusto, config.comissaoLojistaPorcento));
  const pctLucro = Math.max(0, 100 - pctCusto - pctLoja);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
            <Calculator className="w-4 h-4 shrink-0" />
            <span>Precificação Maker · Resumo de Estoque & Estimativa Real</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight text-balance">
            Calculadora de Custo & Estimativa do Estoque
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Calcule o custo real por peça produzida — seja peça avulsa, suporte, miniatura ou chaveiro — usando os dados reais do seu estoque no ateliê e nos pontos de venda.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 px-5 py-4 rounded-2xl text-left lg:text-right shrink-0">
          <span className="text-[11px] text-slate-300 font-semibold block">
            Lucro Líquido Estimado por Peça
          </span>
          <span
            className={`text-2xl sm:text-3xl font-black font-mono tabular-nums block mt-0.5 ${
              resultado.lucroLiquidoLM3D >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {resultado.lucroLiquidoLM3D >= 0 ? '+' : ''}
            {formatCurrency(resultado.lucroLiquidoLM3D)}
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Margem líquida de {resultado.margemLucroLM3D.toFixed(1)}% · Custo {formatCurrency(resultado.custoTotalProducao)}
          </span>
        </div>
      </div>

      {/* Resumo Real do Estoque Atual */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
              Resumo Concreto do Estoque Atual
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visão consolidada do que está pronto no ateliê, exposto em lojas e em peças avulsas na rua.
            </p>
          </div>

          {produtos.length > 0 && (
            <button
              type="button"
              onClick={handleAplicarMediaCatalogo}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Simular com Média Real do Catálogo
            </button>
          )}
        </div>

        {/* 4 KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">Estoque no Ateliê</span>
            <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
              {resumoEstoque.totalAtelieUn} <span className="text-xs font-semibold text-slate-500">peças</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
              {(resumoEstoque.totalAteliePesoG / 1000).toFixed(2)} kg · Custo {formatCurrency(resumoEstoque.totalAtelieCusto)}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">Consignado na Rua (PDVs)</span>
            <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
              {resumoEstoque.totalRuaUn} <span className="text-xs font-semibold text-slate-500">peças</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
              {pdvs.length} PDVs · {resumoEstoque.totalRuaPecasAvulsasUn} peças avulsas
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-xs font-semibold text-slate-500 block">Valor Bruto em Estoque</span>
            <div className="text-xl font-black text-slate-900 font-mono tabular-nums">
              {formatCurrency(resumoEstoque.valorBrutoTotalEstoque)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
              Ateliê {formatCurrency(resumoEstoque.totalAtelieValorVenda)} · Rua {formatCurrency(resumoEstoque.totalRuaValor)}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-1">
            <span className="text-xs font-semibold text-emerald-800 block">Repasse Estimado (Estoque Total)</span>
            <div className="text-xl font-black text-emerald-700 font-mono tabular-nums">
              {formatCurrency(
                resumoEstoque.liquidoAtelieComComissaoAtual + resumoEstoque.totalRuaLiquidoEstimado
              )}
            </div>
            <div className="text-[11px] text-emerald-700 font-mono tabular-nums">
              Comissão média PDVs: {resumoEstoque.comissaoMediaPdvs.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Breakdown por Categoria + Tabela de Itens para Carregar na Calculadora */}
        {produtos.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Nenhum produto cadastrado no catálogo ainda. Cadastre produtos na aba <strong>Catálogo</strong> para carregar pesos, tempos e saldos reais automaticamente aqui.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 pt-1">
            {/* Resumo por Categoria */}
            <div className="xl:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Distribuição por Categoria
                </h3>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {resumoEstoque.totalGeralUn} peças totais
                </span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {resumoEstoque.porCategoria.map((cat) => (
                  <div
                    key={cat.categoria}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 block truncate">
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {cat.modelos} {cat.modelos === 1 ? 'modelo' : 'modelos'} · Ateliê {cat.atelieUn} un · Rua {cat.consignadoUn} un
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-900 font-mono tabular-nums block">
                        {formatCurrency(cat.valorVendaPotencial)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {cat.pesoTotalG}g ateliê
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Itens do Estoque clicáveis para simular */}
            <div className="xl:col-span-7 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Produtos no Estoque (clique para calcular)
                </h3>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFiltroEstoque('todos')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      filtroEstoque === 'todos'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({produtos.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEstoque('atelie')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      filtroEstoque === 'atelie'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    No Ateliê
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroEstoque('rua')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      filtroEstoque === 'rua'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Consignados
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                      <tr>
                        <th className="px-3.5 py-2.5">Produto</th>
                        <th className="px-3 py-2.5 text-right">Peso</th>
                        <th className="px-3 py-2.5 text-right">Ateliê</th>
                        <th className="px-3 py-2.5 text-right">Rua</th>
                        <th className="px-3 py-2.5 text-right">Venda</th>
                        <th className="px-3 py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {produtosFiltradosEstoque.map((prod) => {
                        const isSelected = selectedProdutoId === prod.id;
                        const catInfo = getCategoriaLabel(prod.categoria);
                        return (
                          <tr
                            key={prod.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-3.5 py-2.5">
                              <div className="font-bold text-slate-900 truncate max-w-[180px]">
                                {prod.nome}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {formatProductCode(prod)} · {catInfo.label}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-700">
                              {prod.pesoGramas}g
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-slate-900">
                              {prod.estoqueAtelie} un
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-slate-600">
                              {prod.totalConsignado} un
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-emerald-700">
                              {formatCurrency(prod.precoVenda)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleSelectProduto(prod.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                              >
                                <span>{isSelected ? 'Selecionado' : 'Calcular'}</span>
                                {!isSelected && <ArrowUpRight className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {produtosFiltradosEstoque.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                            Nenhum produto encontrado neste filtro de estoque.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Parâmetros de Entrada (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          {/* Base do Cálculo Concreta */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              Base da Estimativa (Produto & PDV)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Carregar Produto do Estoque
                </label>
                <select
                  value={selectedProdutoId}
                  onChange={(e) => handleSelectProduto(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-semibold bg-white"
                >
                  <option value="manual">Simulação Manual / Peça Avulsa</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.pesoGramas}g · Estoque: {p.estoqueAtelie} un)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Aplicar Comissão de PDV Real
                </label>
                <select
                  value={selectedPdvId}
                  onChange={(e) => handleSelectPdv(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-semibold bg-white"
                >
                  <option value="padrao">Comissão Manual ({config.comissaoLojistaPorcento}%)</option>
                  {pdvs.map((pdv) => (
                    <option key={pdv.id} value={pdv.id}>
                      {pdv.nomeLoja} ({pdv.comissaoLojaPorcentagem}% comissão)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo de Produto / Acabamento */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-600">
                Tipo de Peça & Acabamento
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('peca_avulsa')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    acabamentoPreset === 'peca_avulsa'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Peça Avulsa
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('suporte_miniatura')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    acabamentoPreset === 'suporte_miniatura'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Suporte / Miniatura
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('chaveiro')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    acabamentoPreset === 'chaveiro'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Com Argola / Gancho
                </button>
              </div>
            </div>
          </div>

          {/* Seção 1: Custos de Impressão 3D */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-teal-600" />
              1. Impressão 3D (Filamento, Peso & Tempo)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Preço do Carretel (R$/kg)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={config.precoFilamentoKg}
                  onChange={(e) =>
                    setConfig({ ...config, precoFilamentoKg: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">PLA / PETG / ABS</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Peso da Peça / Produto (gramas)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.pesoGramas}
                  onChange={(e) =>
                    setConfig({ ...config, pesoGramas: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Conforme fatiador 3D (com suportes)
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tempo de Impressão (min)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={config.tempoMinutos}
                  onChange={(e) =>
                    setConfig({ ...config, tempoMinutos: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Tempo médio por peça</span>
              </div>
            </div>

            {/* Consumo de energia visível */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Potência Média da Impressora (Watts)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={config.potenciaWatts}
                  onChange={(e) =>
                    setConfig({ ...config, potenciaWatts: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tarifa de Energia Elétrica (R$/kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={config.tarifaKwh}
                  onChange={(e) =>
                    setConfig({ ...config, tarifaKwh: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Custos de Ferragens e Embalagem */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              2. Acessórios, Ferragens & Embalagem
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Acessórios / Ferragens (Argola, Imã, Parafuso) (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={config.custoArgolaCorrente}
                  onChange={(e) =>
                    setConfig({ ...config, custoArgolaCorrente: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Deixe R$ 0,00 para peças avulsas sem ferragem
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Embalagem, Etiqueta / Tag (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.05"
                  value={config.custoEmbalagemTag}
                  onChange={(e) =>
                    setConfig({ ...config, custoEmbalagemTag: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold font-mono tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Saquinho, blister ou caixa individual
                </span>
              </div>
            </div>
          </div>

          {/* Seção 3: Preço e Acordo com a Loja Consignada */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-600" />
              3. Preço de Venda & Comissão da Loja
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Preço de Venda ao Consumidor (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.precoVendaConsumidor}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      precoVendaConsumidor: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900 font-mono tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Valor final cobrado no ponto de venda ou venda direta
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Comissão da Loja Parceira (%)
                </label>
                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={config.comissaoLojistaPorcento}
                    onChange={(e) => {
                      setSelectedPdvId('padrao');
                      setConfig({
                        ...config,
                        comissaoLojistaPorcento: Number(e.target.value),
                      });
                    }}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-sm font-black text-blue-700 w-12 text-right font-mono tabular-nums">
                    {config.comissaoLojistaPorcento}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Use 0% para venda direta própria ou 25%–35% para consignação
                </span>
              </div>
            </div>
          </div>

          {/* Rendimento Concreto por Carretel de 1 kg */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Weight className="w-4 h-4 text-slate-600" />
                Rendimento de 1 Carretel (1.000g)
              </h4>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                {config.pesoGramas}g/peça
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Peças por Carretel</span>
                <strong className="text-sm font-black text-slate-900 font-mono tabular-nums">
                  {pecasPorCarretel} un
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Tempo Total</span>
                <strong className="text-sm font-black text-slate-900 font-mono tabular-nums">
                  {horasImpressaoCarretel.toFixed(1)} h
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Lucro por Carretel</span>
                <strong className="text-sm font-black text-emerald-700 font-mono tabular-nums">
                  {formatCurrency(lucroPorCarretel)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: DRE Unitário & Simulação Concreta (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Demonstrativo de Lucro por Peça
                </h3>
                {selectedProduto && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modelo: <strong className="text-slate-700">{selectedProduto.nome}</strong> · Estoque: {selectedProduto.estoqueAtelie} ateliê / {selectedProduto.totalConsignado} rua
                  </p>
                )}
                {selectedPdv && (
                  <p className="text-[11px] text-slate-500">
                    PDV: <strong className="text-slate-700">{selectedPdv.nomeLoja}</strong> ({selectedPdv.comissaoLojaPorcentagem}%)
                  </p>
                )}
              </div>
            </div>

            {/* Linhas de custo */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Filamento ({config.pesoGramas}g):</span>
                <span className="font-semibold text-slate-800 font-mono tabular-nums">
                  {formatCurrency(resultado.custoFilamento)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">
                  Energia Elétrica ({config.tempoMinutos} min · {config.potenciaWatts}W):
                </span>
                <span className="font-semibold text-slate-800 font-mono tabular-nums">
                  {formatCurrency(resultado.custoEnergia)}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Acessórios / Ferragens + Embalagem:</span>
                <span className="font-semibold text-slate-800 font-mono tabular-nums">
                  {formatCurrency(resultado.custoFerragem + resultado.custoEmbalagem)}
                </span>
              </div>

              <div className="flex justify-between py-2 bg-rose-50 px-3 rounded-xl text-rose-800 font-bold">
                <span>Custo Total de Produção:</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(resultado.custoTotalProducao)}
                </span>
              </div>

              {selectedProduto && selectedProduto.custoProducao > 0 && (
                <div className="flex justify-between px-3 py-1 text-[11px] text-slate-500">
                  <span>Custo cadastrado no catálogo:</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {formatCurrency(selectedProduto.custoProducao)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 bg-blue-50 px-3 rounded-xl text-blue-900 font-bold">
                <span>Comissão Loja Parceira ({config.comissaoLojistaPorcento}%):</span>
                <span className="font-mono tabular-nums">
                  - {formatCurrency(resultado.comissaoLojaValor)}
                </span>
              </div>

              <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded-xl text-emerald-950 font-black text-sm border border-emerald-200">
                <span>Líquido a Repassar para a LM3D:</span>
                <span className="text-emerald-700 font-mono tabular-nums">
                  {formatCurrency(resultado.valorLiquidoLM3D)}
                </span>
              </div>

              <div className="flex justify-between py-2.5 bg-teal-500 text-slate-950 px-3.5 rounded-xl font-black text-base shadow-xs">
                <span>LUCRO LÍQUIDO LM3D:</span>
                <span className="font-mono tabular-nums">
                  {resultado.lucroLiquidoLM3D >= 0 ? '+' : ''}
                  {formatCurrency(resultado.lucroLiquidoLM3D)}
                </span>
              </div>
            </div>

            {/* Barra Visual de Distribuição */}
            <div className="pt-2 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 block">
                Composição do Preço de {formatCurrency(config.precoVendaConsumidor)}:
              </span>

              <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-100">
                <div
                  className="bg-rose-500 h-full transition-all duration-200"
                  title={`Custo Produção: ${formatCurrency(resultado.custoTotalProducao)}`}
                  style={{ width: `${pctCusto}%` }}
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-200"
                  title={`Comissão Loja: ${formatCurrency(resultado.comissaoLojaValor)}`}
                  style={{ width: `${pctLoja}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-200"
                  title={`Lucro Líquido: ${formatCurrency(resultado.lucroLiquidoLM3D)}`}
                  style={{ width: `${pctLucro}%` }}
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 text-[11px] font-semibold text-slate-600 pt-1 font-mono tabular-nums">
                <span className="text-rose-600">Custo ({pctCusto.toFixed(0)}%)</span>
                <span className="text-blue-600">Loja ({config.comissaoLojistaPorcento}%)</span>
                <span className="text-emerald-600">Lucro ({pctLucro.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* Simulador Concreto de Lote / Estoque / Escala */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                Estimativa de Lote / Giro Mensal
              </h4>
              <span className="text-xs font-bold text-white font-mono tabular-nums">
                {escalaPecasMes} peças
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="2000"
              step="10"
              value={escalaPecasMes}
              onChange={(e) => setEscalaPecasMes(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />

            {resumoEstoque.totalGeralUn > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {resumoEstoque.totalAtelieUn > 0 && (
                  <button
                    type="button"
                    onClick={() => setEscalaPecasMes(Math.min(2000, resumoEstoque.totalAtelieUn))}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Simular Ateliê ({resumoEstoque.totalAtelieUn} un)
                  </button>
                )}
                {resumoEstoque.totalRuaUn > 0 && (
                  <button
                    type="button"
                    onClick={() => setEscalaPecasMes(Math.min(2000, resumoEstoque.totalRuaUn))}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Simular Rua ({resumoEstoque.totalRuaUn} un)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEscalaPecasMes(Math.min(2000, resumoEstoque.totalGeralUn))}
                  className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-[11px] font-semibold text-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                >
                  Todo Estoque ({resumoEstoque.totalGeralUn} un)
                </button>
              </div>
            )}

            <div className="text-[11px] text-slate-300 space-y-1 font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-400">Filamento necessário:</span>
                <span>{filamentoNecessarioKg.toFixed(2)} kg (~{Math.ceil(filamentoNecessarioKg)} carretéis)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tempo de impressão total:</span>
                <span>{horasTotaisImpressao.toFixed(1)} horas ({Math.round(escalaPecasMes / 30)} peças/dia)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Venda bruta ao consumidor:</span>
                <span>{formatCurrency(faturamentoBrutoEscala)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Comissão dos PDVs / Custo produção:</span>
                <span>
                  {formatCurrency(comissaoLojasEscala)} / {formatCurrency(custoTotalEscala)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Repasse Total LM3D:</span>
                <strong className="text-white font-black text-sm font-mono tabular-nums">
                  {formatCurrency(liquidoLM3DEscala)}
                </strong>
              </div>
              <div>
                <span className="text-emerald-400 block text-[10px]">LUCRO LÍQUIDO ESTIMADO:</span>
                <strong className="text-emerald-400 font-black text-base font-mono tabular-nums">
                  {formatCurrency(lucroLiquidoEscala)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
