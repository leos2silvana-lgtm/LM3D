import React, { useState, useMemo } from 'react';
import { PontoDeVenda, Produto3D } from '../types';
import { formatCurrency, formatShortDate, getPDVCapacidadeTotal, getPDVResumoDisplays } from '../utils/formatters';
import { 
  X, 
  Check, 
  Boxes, 
  Store, 
  Package, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Search, 
  Layers,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Bluetooth
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaperWidth } from '../services/bluetoothPrinter';

interface RestockPDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdvs: PontoDeVenda[];
  produtos: Produto3D[];
  initialPdvId?: string;
  initialMode?: 'abastecer' | 'recolher';
  onConfirmRestock: (
    pdvId: string, 
    itens: { produtoId: string; quantidade: number }[],
    observacao?: string,
    tipoOperacao?: 'abastecer' | 'recolher',
    printOptions?: { abrirImpressao?: boolean; larguraPapel?: PaperWidth }
  ) => void;
}

export function RestockPDVModal({
  isOpen,
  onClose,
  pdvs,
  produtos,
  initialPdvId,
  initialMode = 'abastecer',
  onConfirmRestock,
}: RestockPDVModalProps) {
  const [tipoOperacao, setTipoOperacao] = useState<'abastecer' | 'recolher'>(initialMode);
  const [selectedPdvId, setSelectedPdvId] = useState<string>(() => {
    if (initialPdvId && pdvs.some(p => p.id === initialPdvId)) return initialPdvId;
    return pdvs[0]?.id || '';
  });

  const [busca, setBusca] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Quantidades para cada produtoId (seja para abastecer ou para recolher)
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [confirmarPendencia, setConfirmarPendencia] = useState(false);
  const [abrirImpressao, setAbrirImpressao] = useState<boolean>(initialMode !== 'recolher');
  const [larguraPapel, setLarguraPapel] = useState<PaperWidth>('58mm');

  // Reset or update state when opening
  React.useEffect(() => {
    if (isOpen) {
      if (initialPdvId && pdvs.some(p => p.id === initialPdvId)) {
        setSelectedPdvId(initialPdvId);
      } else if (pdvs.length > 0 && (!selectedPdvId || !pdvs.some(p => p.id === selectedPdvId))) {
        setSelectedPdvId(pdvs[0].id);
      }
      const mode = initialMode || 'abastecer';
      setTipoOperacao(mode);
      setQuantidades({});
      setObservacao('');
      setBusca('');
      setErroValidacao(null);
      setConfirmarPendencia(false);
      setAbrirImpressao(mode === 'abastecer');
    }
  }, [isOpen, initialMode, initialPdvId, pdvs]);

  const pdv = useMemo(() => {
    return pdvs.find(p => p.id === selectedPdvId) || pdvs[0];
  }, [pdvs, selectedPdvId]);

  const mapaPecasNoPdv = useMemo(() => {
    const map = new Map<string, number>();
    (pdv?.itensNoDisplay || []).forEach(item => {
      map.set(item.produtoId, (map.get(item.produtoId) || 0) + item.quantidade);
    });
    return map;
  }, [pdv]);

  // Produtos filtrados por busca
  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtos;
    const term = busca.toLowerCase();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(term) ||
      (p.codigo && p.codigo.toLowerCase().includes(term)) ||
      p.descricao.toLowerCase().includes(term)
    );
  }, [produtos, busca]);

  const handleUpdateQtd = (produtoId: string, valor: number) => {
    const safeVal = Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
    setQuantidades(prev => ({
      ...prev,
      [produtoId]: safeVal,
    }));
    setErroValidacao(null);
    setConfirmarPendencia(false);
  };

  const handleStepQtd = (produtoId: string, delta: number) => {
    setQuantidades(prev => {
      const atual = prev[produtoId] || 0;
      const novo = Math.max(0, atual + delta);
      return {
        ...prev,
        [produtoId]: novo,
      };
    });
    setErroValidacao(null);
    setConfirmarPendencia(false);
  };

  const handleSetMaxEstoque = (produtoId: string, maxDisponivel: number) => {
    setQuantidades(prev => ({
      ...prev,
      [produtoId]: Math.max(0, maxDisponivel),
    }));
  };

  const handleZerarProduto = (produtoId: string) => {
    setQuantidades(prev => {
      const copy = { ...prev };
      delete copy[produtoId];
      return copy;
    });
  };

  // Itens selecionados com quantidade > 0
  const itensSelecionados = useMemo(() => {
    return Object.entries(quantidades)
      .filter(([_, qtd]) => qtd > 0)
      .map(([prodId, qtd]) => {
        const prod = produtos.find(p => p.id === prodId);
        if (!prod) return null;
        const estoqueDisp = prod.estoqueAtelie || 0;
        const temDeficit = tipoOperacao === 'abastecer' && qtd > estoqueDisp;
        const deficit = tipoOperacao === 'abastecer' ? Math.max(0, qtd - estoqueDisp) : 0;

        return {
          produtoId: prodId,
          produto: prod,
          quantidade: qtd,
          estoqueDisponivel: estoqueDisp,
          temDeficit,
          deficit,
          subtotalValor: qtd * (prod.precoVenda || 13.00),
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);
  }, [quantidades, produtos, tipoOperacao]);

  const totalPecasMovimento = useMemo(() => {
    return itensSelecionados.reduce((acc, i) => acc + i.quantidade, 0);
  }, [itensSelecionados]);

  const totalValorMovimento = useMemo(() => {
    return itensSelecionados.reduce((acc, i) => acc + i.subtotalValor, 0);
  }, [itensSelecionados]);

  // Lista de itens com falta de estoque no Ateliê (apenas modo abastecer)
  const itensComDeficit = useMemo(() => {
    if (tipoOperacao !== 'abastecer') return [];
    return itensSelecionados.filter(i => i.temDeficit);
  }, [itensSelecionados, tipoOperacao]);

  const totalDeficitPecas = useMemo(() => {
    return itensComDeficit.reduce((acc, i) => acc + i.deficit, 0);
  }, [itensComDeficit]);

  // Capacidades no Expositor do PDV
  const pecasAtuaisDisplay = pdv?.totalPecasNoDisplay || 0;
  const capacidadeDisplay = pdv ? getPDVCapacidadeTotal(pdv) : 48;

  // Cálculos dependentes do modo
  const pecasAposMovimento = tipoOperacao === 'abastecer'
    ? pecasAtuaisDisplay + totalPecasMovimento
    : Math.max(0, pecasAtuaisDisplay - totalPecasMovimento);

  const excedeuCapacidade = tipoOperacao === 'abastecer' && pecasAposMovimento > capacidadeDisplay;
  const excedeuPecasNoPDV = tipoOperacao === 'recolher' && totalPecasMovimento > pecasAtuaisDisplay;

  // Ajustar todos os itens para o limite do estoque
  const handleAjustarTodosParaEstoque = () => {
    setQuantidades(prev => {
      const novo: Record<string, number> = { ...prev };
      itensComDeficit.forEach(item => {
        novo[item.produtoId] = Math.max(0, item.estoqueDisponivel);
      });
      return novo;
    });
  };

  const handleAlternarModo = (novoModo: 'abastecer' | 'recolher') => {
    if (novoModo === tipoOperacao) return;
    setTipoOperacao(novoModo);
    setQuantidades({});
    setErroValidacao(null);
    setConfirmarPendencia(false);
  };

  const finalizeSubmit = () => {
    if (!pdv) return;
    const payload = itensSelecionados.map(i => ({
      produtoId: i.produtoId,
      quantidade: i.quantidade,
    }));

    try {
      confetti({ particleCount: 60, spread: 60 });
    } catch {
      // ignore
    }

    onConfirmRestock(pdv.id, payload, observacao, tipoOperacao, {
      abrirImpressao,
      larguraPapel,
    });
    onClose();
    setQuantidades({});
    setConfirmarPendencia(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdv) return;
    setErroValidacao(null);

    if (totalPecasMovimento === 0) {
      setErroValidacao(
        tipoOperacao === 'abastecer'
          ? 'Por favor, informe a quantidade de pelo menos um produto para abastecer o PDV.'
          : 'Por favor, informe a quantidade de peças que deseja retirar do PDV para voltar ao seu estoque.'
      );
      return;
    }

    if (
      ((tipoOperacao === 'abastecer' && itensComDeficit.length > 0) ||
        (tipoOperacao === 'recolher' && excedeuPecasNoPDV)) &&
      !confirmarPendencia
    ) {
      setConfirmarPendencia(true);
      return;
    }

    finalizeSubmit();
  };

  if (!isOpen) return null;

  const isRecolher = tipoOperacao === 'recolher';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className={`text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b shrink-0 transition-colors ${
          isRecolher 
            ? 'bg-slate-900 border-indigo-900/50' 
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors ${
              isRecolher ? 'bg-indigo-500 text-white shadow-xs' : 'bg-teal-500 text-slate-950'
            }`}>
              {isRecolher ? (
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {isRecolher 
                  ? 'Retirar Peças do PDV & Voltar ao Estoque' 
                  : 'Abastecer Ponto de Venda & Sincronizar Estoque'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {isRecolher
                  ? 'Recolha chaveiros do expositor da loja de volta para o seu Ateliê'
                  : 'Reposição de chaveiros 3D com alerta de estoque disponível no Ateliê'}
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

        {/* Seletor de Modo de Operação (Abastecer vs Retirar/Recolher) */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-slate-100/70 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => handleAlternarModo('abastecer')}
              className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                !isRecolher
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Abastecer PDV (Ateliê ➔ Loja)</span>
            </button>

            <button
              type="button"
              onClick={() => handleAlternarModo('recolher')}
              className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 ${
                isRecolher
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Retirar Peças (Loja ➔ Meu Estoque)</span>
            </button>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {isRecolher ? (
              <span>
                <strong>Modo Retirada:</strong> As peças selecionadas serão descontadas do PDV e <strong>somadas de volta ao seu estoque no Ateliê</strong>.
              </span>
            ) : (
              <span>
                <strong>Modo Abastecimento:</strong> As peças enviadas serão descontadas do Ateliê e <strong>adicionadas ao expositor do PDV</strong>.
              </span>
            )}
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          
          {/* Seleção do PDV */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Escolha o Ponto de Venda Parceiro (PDV)
              </label>
              <select
                value={pdv?.id || ''}
                onChange={(e) => {
                  setSelectedPdvId(e.target.value);
                  setQuantidades({});
                  setErroValidacao(null);
                  setConfirmarPendencia(false);
                }}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                {pdvs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nomeLoja} ({p.responsavel}) — No PDV: {p.totalPecasNoDisplay}/{getPDVCapacidadeTotal(p)} peças
                  </option>
                ))}
              </select>
            </div>

            {/* Status do Expositor da Loja */}
            {pdv && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">No PDV Atual</span>
                    <strong className="text-slate-900 font-black text-sm">{pdv.totalPecasNoDisplay} un</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      {isRecolher ? 'A Retirar' : 'Capacidade Total'}
                    </span>
                    <strong className={`font-black text-sm ${isRecolher ? 'text-indigo-600' : 'text-slate-700'}`}>
                      {isRecolher ? `${totalPecasMovimento} un` : `${capacidadeDisplay} un`}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      {isRecolher ? 'Restará no PDV' : 'Após Abastecer'}
                    </span>
                    <strong className={`font-black text-sm ${
                      isRecolher 
                        ? (excedeuPecasNoPDV ? 'text-amber-600' : 'text-slate-800') 
                        : (excedeuCapacidade ? 'text-amber-600' : 'text-emerald-600')
                    }`}>
                      {pecasAposMovimento} un
                    </strong>
                  </div>
                </div>

                {/* Resumo da composição de displays e peças avulsas */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <Layers className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-semibold">Configuração:</span>
                  <span className="text-slate-700 font-medium truncate">{getPDVResumoDisplays(pdv)}</span>
                </div>
              </div>
            )}

            {excedeuCapacidade && !isRecolher && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Aviso: O PDV comporta <strong>{capacidadeDisplay}</strong> peças no total. Após este abastecimento ficará com <strong>{pecasAposMovimento}</strong> peças.
                </span>
              </div>
            )}

            {excedeuPecasNoPDV && isRecolher && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Aviso: Você está retirando <strong>{totalPecasMovimento}</strong> peças, que é maior do que o total registrado na loja (<strong>{pecasAtuaisDisplay}</strong> peças).
                </span>
              </div>
            )}
          </div>

          {/* Alerta Geral de Estoque Insuficiente no Ateliê (apenas ao abastecer) */}
          {itensComDeficit.length > 0 && !isRecolher && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 sm:p-4 space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-black text-rose-900 uppercase tracking-wide">
                    Estoque Insuficiente no Ateliê para {itensComDeficit.length} Modelo(s)!
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                    Você solicitou mais peças do que estão prontas no Ateliê LM3D. Faltam <strong>{totalDeficitPecas} peças</strong> no total.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAjustarTodosParaEstoque}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold rounded-lg shadow-xs shrink-0 active:scale-95 transition-all"
                >
                  Ajustar para o Máximo Disponível
                </button>
              </div>

              {/* Lista dos produtos deficitários */}
              <div className="pt-2 border-t border-rose-200/60 flex flex-wrap gap-1.5">
                {itensComDeficit.map(item => (
                  <span 
                    key={item.produtoId}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-100/80 text-rose-800 border border-rose-200"
                  >
                    <span>{item.produto?.nome}:</span>
                    <span className="text-rose-950 font-black">Falta {item.deficit} un</span>
                    <span className="text-rose-500 font-normal">({item.estoqueDisponivel} no ateliê)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Seleção de Produtos para Abastecer ou Recolher */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {isRecolher 
                    ? 'Selecione as Peças a Retirar do PDV (Voltam ao Ateliê)' 
                    : 'Catálogo de Produtos 3D & Estoque do Ateliê'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isRecolher
                    ? 'Informe quantas unidades de cada modelo você está recolhendo da loja'
                    : 'Informe quantas unidades de cada modelo serão enviadas para o display'}
                </p>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar modelo 3D..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
                />
              </div>
            </div>

            {/* Lista de Produtos */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {produtosFiltrados.map((prod) => {
                const qtd = quantidades[prod.id] || 0;
                const estoqueDisp = prod.estoqueAtelie;
                const qtdNoPdv = mapaPecasNoPdv.get(prod.id) || 0;
                const temFalta = !isRecolher && qtd > estoqueDisp;
                const faltaQtd = qtd - estoqueDisp;

                return (
                  <div
                    key={prod.id}
                    className={`border rounded-2xl p-3 transition-all ${
                      temFalta
                        ? 'border-rose-300 bg-rose-50/50 shadow-xs'
                        : qtd > 0
                        ? isRecolher
                          ? 'border-indigo-300 bg-indigo-50/30 shadow-2xs'
                          : 'border-teal-300 bg-teal-50/30 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Info Produto */}
                      <div className="flex items-center gap-3 min-w-0">
                        {prod.fotoUrl ? (
                          <img
                            src={prod.fotoUrl}
                            alt={prod.nome}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight truncate">
                              {prod.nome}
                            </span>
                            {prod.codigo && (
                              <span className="font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                {prod.codigo}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                            <span>Preço Venda: <strong className="text-slate-800">{formatCurrency(prod.precoVenda)}</strong></span>
                            <span>•</span>
                            
                            {/* Badges contextuais dependendo do modo */}
                            {isRecolher ? (
                              <>
                                <span className="font-bold px-2 py-0.2 rounded-full border text-[10px] inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border-indigo-200">
                                  Estoque no Ateliê: <strong>{estoqueDisp} un</strong>
                                  {qtd > 0 && (
                                    <span className="text-emerald-700 font-black">
                                      ➔ {estoqueDisp + qtd} un (+{qtd})
                                    </span>
                                  )}
                                </span>
                                {qtdNoPdv > 0 && (
                                  <span className="font-bold px-2 py-0.2 rounded-full border text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                                    No PDV: <strong>{qtdNoPdv} un</strong>
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className={`font-bold px-2 py-0.2 rounded-full border text-[10px] inline-flex items-center gap-1 ${
                                  estoqueDisp === 0
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : estoqueDisp <= 3
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  Disponível Ateliê: <strong>{estoqueDisp} un</strong>
                                </span>
                                {qtdNoPdv > 0 && (
                                  <span className="font-bold px-2 py-0.2 rounded-full border text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                                    No PDV: <strong>{qtdNoPdv} un</strong>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contador de Movimentação */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        {/* Botão de Atalho ou Zerar */}
                        {qtd > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleZerarProduto(prod.id)}
                            className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-100 rounded-lg"
                            title="Zerar quantidade"
                          >
                            Zerar
                          </button>
                        ) : !isRecolher ? (
                          <button
                            type="button"
                            onClick={() => handleSetMaxEstoque(prod.id, estoqueDisp)}
                            className="px-2 py-1 text-[10px] font-extrabold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200 rounded-lg active:scale-95 transition-all"
                            title="Preencher com todo o estoque pronto"
                          >
                            Máx ({estoqueDisp})
                          </button>
                        ) : qtdNoPdv > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleSetMaxEstoque(prod.id, qtdNoPdv)}
                            className="px-2 py-1 text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg active:scale-95 transition-all"
                            title="Retirar todas as unidades deste modelo do PDV"
                          >
                            Máx PDV ({qtdNoPdv})
                          </button>
                        ) : null}

                        {/* Atalhos Rápidos */}
                        <div className="flex items-center gap-1">
                          {[1, 5, 10].map(step => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => handleStepQtd(prod.id, step)}
                              className={`px-1.5 py-1 text-[10px] font-bold rounded-md active:scale-95 transition-colors ${
                                isRecolher 
                                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
                              }`}
                            >
                              +{step}
                            </button>
                          ))}
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepQtd(prod.id, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-700 font-black flex items-center justify-center border border-slate-200 active:scale-95"
                            aria-label="Diminuir"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            value={qtd}
                            onChange={(e) => handleUpdateQtd(prod.id, Number(e.target.value))}
                            className={`w-14 h-8 text-center font-black text-xs rounded-lg border outline-none ${
                              temFalta
                                ? 'border-rose-400 bg-rose-100/50 text-rose-950'
                                : isRecolher && qtd > 0
                                ? 'border-indigo-400 bg-indigo-50 text-indigo-950'
                                : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-teal-500'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={() => handleStepQtd(prod.id, 1)}
                            className="w-8 h-8 rounded-lg bg-slate-100 active:bg-slate-200 text-slate-700 font-black flex items-center justify-center border border-slate-200 active:scale-95"
                            aria-label="Aumentar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Alerta Individual de Estoque Insuficiente (Apenas Abastecimento) */}
                    {temFalta && (
                      <div className="mt-2.5 pt-2 border-t border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-rose-700 bg-rose-100/40 px-2.5 py-1.5 rounded-lg">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>
                            Estoque insuficiente no Ateliê: você pediu <strong>{qtd} un</strong>, mas só há <strong>{estoqueDisp} un</strong> prontas (falta <strong>{faltaQtd} un</strong>).
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetMaxEstoque(prod.id, estoqueDisp)}
                          className="text-[11px] font-extrabold text-rose-800 underline hover:text-rose-950 text-left sm:text-right shrink-0"
                        >
                          Limitar a {estoqueDisp} un
                        </button>
                      </div>
                    )}

                    {/* Feedback ao vivo no modo recolher */}
                    {isRecolher && qtd > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-indigo-100 flex items-center justify-between text-[11px] text-indigo-700">
                        <span>
                          Retirar <strong>{qtd} un</strong> do PDV
                        </span>
                        <span className="font-bold text-emerald-700">
                          +{qtd} un voltarão para o seu estoque no Ateliê
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observações da Operação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {isRecolher 
                ? 'Motivo / Observações da Retirada (Opcional)' 
                : 'Observações da Remessa / Abastecimento (Opcional)'}
            </label>
            <input
              type="text"
              placeholder={isRecolher 
                ? "Ex: Troca de modelos sem saída, devolução ao ateliê para redistribuição..." 
                : "Ex: Entregue diretamente para o gerente Carlos no balcão..."}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
            />
          </div>

          {/* Resumo da Operação */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{isRecolher ? 'Total de Peças a Retirar do PDV:' : 'Total de Peças a Enviar:'}</span>
              <strong className={`text-sm font-black ${isRecolher ? 'text-indigo-600' : 'text-slate-900'}`}>
                {totalPecasMovimento} unidades
              </strong>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>{isRecolher ? 'Valor em Mercadoria Recolhida:' : 'Valor Total Consignado Adicionado:'}</span>
              <strong className="text-emerald-600 text-sm font-black">{formatCurrency(totalValorMovimento)}</strong>
            </div>

            {isRecolher ? (
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span className="font-semibold text-indigo-900">Destino: Devolução ao Meu Estoque</span>
                <strong className="text-indigo-700 font-extrabold">
                  +{totalPecasMovimento} un somadas ao Ateliê
                </strong>
              </div>
            ) : null}

            <div className="flex justify-between text-slate-600">
              <span>Estoque Restante no Display do Parceiro:</span>
              <strong className={
                isRecolher 
                  ? 'text-slate-900 font-bold' 
                  : (excedeuCapacidade ? 'text-amber-600 font-bold' : 'text-slate-900 font-bold')
              }>
                {pecasAposMovimento} {isRecolher ? 'peças' : `de ${capacidadeDisplay} peças suportadas`}
              </strong>
            </div>
          </div>

          {/* Opção de Impressão Bluetooth / Papel do Relatório de Estoque na Loja */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-start gap-2.5 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={abrirImpressao}
                onChange={(e) => setAbrirImpressao(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600 rounded shrink-0"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Bluetooth className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Imprimir papel do relatório do estoque na loja (Bluetooth)</span>
                </span>
                <span className="text-[11px] text-slate-600 block">
                  Gera o comprovante com os itens abastecidos e a lista completa atualizada do expositor para imprimir via Bluetooth ou PDF.
                </span>
              </div>
            </label>

            {abrirImpressao && (
              <div className="flex items-center gap-1 p-1 bg-white border border-blue-200 rounded-xl shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setLarguraPapel('58mm')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    larguraPapel === '58mm'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setLarguraPapel('80mm')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                    larguraPapel === '80mm'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm
                </button>
              </div>
            )}
          </div>

          {erroValidacao && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">{erroValidacao}</span>
            </div>
          )}

          {confirmarPendencia && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black block">
                    {isRecolher
                      ? 'Confirmar retirada maior que o saldo do PDV?'
                      : `Confirmar abastecimento com ${totalDeficitPecas} peça(s) em falta no Ateliê?`}
                  </strong>
                  <span className="text-[11px] text-amber-900">
                    {isRecolher
                      ? `Você selecionou ${totalPecasMovimento} peças para retirar, mas o PDV possui ${pecasAtuaisDisplay} registradas. O saldo do PDV ficará zerado e as ${totalPecasMovimento} peças entrarão no estoque do Ateliê.`
                      : `O estoque pronto desses modelos ficará zerado no Ateliê e o saldo do PDV receberá as ${totalPecasMovimento} peças informadas.`}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmarPendencia(false)}
                  className="px-3 py-1.5 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg"
                >
                  Voltar e Ajustar
                </button>
                <button
                  type="button"
                  onClick={finalizeSubmit}
                  className="px-3.5 py-1.5 text-[11px] font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs"
                >
                  Confirmar mesmo assim
                </button>
              </div>
            </div>
          )}

          {/* Desktop Footer Actions */}
          <div className="hidden sm:flex pt-4 border-t border-slate-200 items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={totalPecasMovimento === 0}
              className={`px-5 py-2.5 text-xs font-black rounded-xl shadow-lg flex items-center gap-2 transition-all ${
                totalPecasMovimento === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isRecolher
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                  : itensComDeficit.length > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 active:scale-95'
              }`}
            >
              {isRecolher ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  {`Confirmar Retirada & Devolver ao Meu Estoque (+${totalPecasMovimento} un)`}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {itensComDeficit.length > 0
                    ? `Confirmar c/ Alerta de Falta (${totalDeficitPecas} peças)`
                    : `Confirmar Abastecimento (${totalPecasMovimento} peças)`}
                </>
              )}
            </button>
          </div>

          {/* Mobile Sticky Bar */}
          <div className="sm:hidden sticky -bottom-4 -mx-4 px-4 py-3 bg-slate-900 text-white border-t border-slate-800 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none">
                {isRecolher ? 'Total Retirada' : 'Total Reposição'}
              </span>
              <strong className={`text-sm font-black leading-tight ${isRecolher ? 'text-indigo-400' : 'text-teal-400'}`}>
                {totalPecasMovimento} peças ({formatCurrency(totalValorMovimento)})
              </strong>
            </div>
            <button
              type="submit"
              disabled={totalPecasMovimento === 0}
              className={`px-4 py-2.5 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 ${
                totalPecasMovimento === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : isRecolher
                  ? 'bg-indigo-500 text-white'
                  : itensComDeficit.length > 0
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-teal-500 text-slate-950'
              }`}
            >
              {isRecolher ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              {isRecolher ? 'Retirar Peças' : 'Abastecer'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
