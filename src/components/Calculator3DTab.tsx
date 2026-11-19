import React, { useState } from 'react';
import { ConfiguracaoCalculadora3D } from '../types';
import { calculate3DCost, formatCurrency, formatPercent } from '../utils/formatters';
import { 
  Calculator, 
  Sparkles, 
  Zap, 
  Weight, 
  Tag, 
  Layers, 
  TrendingUp, 
  Store, 
  CheckCircle2, 
  Info,
  DollarSign,
  Printer
} from 'lucide-react';

export const Calculator3DTab: React.FC = () => {
  const [config, setConfig] = useState<ConfiguracaoCalculadora3D>({
    precoFilamentoKg: 85.00,
    pesoGramas: 14,
    tempoMinutos: 25,
    potenciaWatts: 150,
    tarifaKwh: 0.95,
    custoArgolaCorrente: 0.80,
    custoEmbalagemTag: 0.45,
    precoVendaConsumidor: 15.00,
    comissaoLojistaPorcento: 30,
  });

  const [escalaPecasMes, setEscalaPecasMes] = useState<number>(300);

  const resultado = calculate3DCost(config);

  // Scale simulation
  const faturamentoBrutoEscala = escalaPecasMes * config.precoVendaConsumidor;
  const comissaoLojasEscala = escalaPecasMes * resultado.comissaoLojaValor;
  const liquidoLM3DEscala = escalaPecasMes * resultado.valorLiquidoLM3D;
  const custoTotalEscala = escalaPecasMes * resultado.custoTotalProducao;
  const lucroLiquidoEscala = escalaPecasMes * resultado.lucroLiquidoLM3D;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
            <Calculator className="w-3.5 h-3.5" />
            Precificação Maker & Consignação
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Calculadora de Custo de Impressão 3D
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Simule com precisão o custo de filamento, energia, argolas de chaveiro, tags e veja seu lucro real na venda consignada em lojas parceiras.
          </p>
        </div>

        <div className="bg-blue-950/80 border border-blue-800/80 px-4 py-3 rounded-2xl text-right shrink-0">
          <span className="text-[11px] text-blue-300 font-semibold block">Lucro Estimado por Peça</span>
          <span className="text-2xl font-black text-emerald-400 block">
            +{formatCurrency(resultado.lucroLiquidoLM3D)}
          </span>
          <span className="text-[10px] text-slate-400">
            Margem líquida de {resultado.margemLucroLM3D.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna 1: Parâmetros de Entrada (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
          
          {/* Seção A: Custos de Impressão 3D */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-teal-600" />
              1. Custo de Impressão 3D (Filamento & Fatiador)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Preço do Carretel (R$/kg)
                </label>
                <input
                  type="number"
                  step="1"
                  value={config.precoFilamentoKg}
                  onChange={(e) => setConfig({ ...config, precoFilamentoKg: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">PLA / PETG comum</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Peso do Chaveiro (gramas)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={config.pesoGramas}
                  onChange={(e) => setConfig({ ...config, pesoGramas: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Conforme fatiador 3D</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tempo de Impressão (min)
                </label>
                <input
                  type="number"
                  step="1"
                  value={config.tempoMinutos}
                  onChange={(e) => setConfig({ ...config, tempoMinutos: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Tempo médio por peça</span>
              </div>
            </div>
          </div>

          {/* Seção B: Custos de Ferragens e Insumos */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              2. Ferragens, Argolas & Embalagem
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Argola Metálica + Corrente + Elo (R$)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={config.custoArgolaCorrente}
                  onChange={(e) => setConfig({ ...config, custoArgolaCorrente: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Pacote c/ 100 argolas italianas</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Saquinho Blister + Tag Cartão LM3D (R$)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={config.custoEmbalagemTag}
                  onChange={(e) => setConfig({ ...config, custoEmbalagemTag: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Embalagem individual expositor</span>
              </div>
            </div>
          </div>

          {/* Seção C: Preço e Acordo com a Loja Consignada */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-600" />
              3. Preço Consumidor & Comissão do Lojista
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Preço de Venda na Loja (R$)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={config.precoVendaConsumidor}
                  onChange={(e) => setConfig({ ...config, precoVendaConsumidor: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Valor pago pelo cliente final</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Comissão da Loja Parceira (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="15"
                    max="50"
                    step="5"
                    value={config.comissaoLojistaPorcento}
                    onChange={(e) => setConfig({ ...config, comissaoLojistaPorcento: Number(e.target.value) })}
                    className="flex-1 accent-blue-600"
                  />
                  <span className="text-sm font-black text-blue-700 w-12 text-right">
                    {config.comissaoLojistaPorcento}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Padrão mercado: 30% a 35%</span>
              </div>
            </div>
          </div>

        </div>

        {/* Coluna 2: DRE Unitário & Gráfico Visual (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Demonstrativo de Lucro por Chaveiro
            </h3>

            {/* Linhas de custo */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Filamento ({config.pesoGramas}g):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(resultado.custoFilamento)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Energia Elétrica ({config.tempoMinutos} min):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(resultado.custoEnergia)}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Argola + Embalagem + Tag:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(resultado.custoFerragem + resultado.custoEmbalagem)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 bg-rose-50 px-3 rounded-xl text-rose-800 font-bold">
                <span>Custo Total de Produção:</span>
                <span>{formatCurrency(resultado.custoTotalProducao)}</span>
              </div>

              <div className="flex justify-between py-1.5 bg-blue-50 px-3 rounded-xl text-blue-900 font-bold">
                <span>Comissão Loja Parceira ({config.comissaoLojistaPorcento}%):</span>
                <span>- {formatCurrency(resultado.comissaoLojaValor)}</span>
              </div>

              <div className="flex justify-between py-2 bg-emerald-50 px-3 rounded-xl text-emerald-950 font-black text-sm border border-emerald-200">
                <span>Líquido a Repassar para a LM3D:</span>
                <span className="text-emerald-700">{formatCurrency(resultado.valorLiquidoLM3D)}</span>
              </div>

              <div className="flex justify-between py-2 bg-teal-500 text-slate-950 px-3.5 rounded-xl font-black text-base shadow-sm">
                <span>LUCRO LÍQUIDO LM3D:</span>
                <span>+{formatCurrency(resultado.lucroLiquidoLM3D)}</span>
              </div>
            </div>

            {/* Barra Visual de Distribuição */}
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Composição do Preço de R$ {config.precoVendaConsumidor.toFixed(2)}:
              </span>
              
              <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100">
                <div 
                  className="bg-rose-500 h-full"
                  title={`Custo Produção: ${formatCurrency(resultado.custoTotalProducao)}`}
                  style={{ width: `${(resultado.custoTotalProducao / config.precoVendaConsumidor) * 100}%` }}
                />
                <div 
                  className="bg-blue-500 h-full"
                  title={`Comissão Loja: ${formatCurrency(resultado.comissaoLojaValor)}`}
                  style={{ width: `${(resultado.comissaoLojaValor / config.precoVendaConsumidor) * 100}%` }}
                />
                <div 
                  className="bg-emerald-500 h-full"
                  title={`Seu Lucro Líquido: ${formatCurrency(resultado.lucroLiquidoLM3D)}`}
                  style={{ width: `${(resultado.lucroLiquidoLM3D / config.precoVendaConsumidor) * 100}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-bold text-slate-500 pt-1">
                <span className="flex items-center gap-1 text-rose-600">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Custo ({((resultado.custoTotalProducao / config.precoVendaConsumidor) * 100).toFixed(0)}%)
                </span>
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Loja ({config.comissaoLojistaPorcento}%)
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Lucro LM3D ({((resultado.lucroLiquidoLM3D / config.precoVendaConsumidor) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>

          </div>

          {/* Simulador de Escala Mensal */}
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                Simulação de Escala Mensal
              </h4>
              <span className="text-xs font-bold text-slate-300">
                {escalaPecasMes} peças/mês
              </span>
            </div>

            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={escalaPecasMes}
              onChange={(e) => setEscalaPecasMes(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            
            <p className="text-[11px] text-slate-400">
              Equivale a ~{Math.round(escalaPecasMes / 30)} chaveiros/dia (cerca de {Math.ceil(escalaPecasMes / 30 / 10)} displays com giro médio de 1 chaveiro por dia).
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Repasse Total LM3D:</span>
                <strong className="text-white font-black text-sm">{formatCurrency(liquidoLM3DEscala)}</strong>
              </div>
              <div>
                <span className="text-emerald-400 block text-[10px]">LUCRO LÍQUIDO MÊS:</span>
                <strong className="text-emerald-400 font-black text-base">{formatCurrency(lucroLiquidoEscala)}</strong>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
