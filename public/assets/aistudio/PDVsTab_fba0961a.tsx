import React, { useState } from 'react';
import { PontoDeVenda } from '../types';
import { 
  formatCurrency, 
  formatShortDate, 
  formatPhone, 
  getSegmentoLabel, 
  getExpositorLabel,
  formatPDVCode,
  normalizeSearch,
  getPDVCapacidadeTotal,
  getPDVResumoDisplays
} from '../utils/formatters';
import { 
  Store, 
  Calendar, 
  Phone, 
  Percent, 
  Receipt, 
  Plus, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Clock, 
  Layers, 
  MapPin, 
  ExternalLink,
  MessageCircle,
  Sparkles,
  ShoppingBag,
  Search,
  Boxes,
  X,
  Pencil,
  Trash2,
  Package,
  RotateCcw
} from 'lucide-react';

interface PDVsTabProps {
  pdvs: PontoDeVenda[];
  onOpenNovoAcerto: (pdvId: string) => void;
  onOpenNovoPDV: () => void;
  onOpenAbastecerPDV?: (pdvId: string, initialMode?: 'abastecer' | 'recolher') => void;
  onEditarPDV?: (pdv: PontoDeVenda) => void;
  onExcluirPDV?: (pdvId: string) => void;
}

export const PDVsTab: React.FC<PDVsTabProps> = ({
  pdvs,
  onOpenNovoAcerto,
  onOpenNovoPDV,
  onOpenAbastecerPDV,
  onEditarPDV,
  onExcluirPDV,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [pdvParaExcluir, setPdvParaExcluir] = useState<PontoDeVenda | null>(null);

  const queryNorm = normalizeSearch(busca);
  const cleanPhoneSearch = busca.replace(/\D/g, '');

  // Filtered stores
  const pdvsFiltrados = pdvs.filter(p => {
    if (queryNorm) {
      const code = formatPDVCode(p);
      const matchLoja = normalizeSearch(p.nomeLoja).includes(queryNorm);
      const matchCode = normalizeSearch(p.codigo || '').includes(queryNorm) ||
                        normalizeSearch(code).includes(queryNorm) ||
                        normalizeSearch(p.id).includes(queryNorm);
      const matchResp = normalizeSearch(p.responsavel).includes(queryNorm);
      const matchBairro = normalizeSearch(p.bairroCidade).includes(queryNorm);
      const matchEnd = normalizeSearch(p.endereco).includes(queryNorm);
      const matchSeg = normalizeSearch(getSegmentoLabel(p.segmento)).includes(queryNorm) ||
                       normalizeSearch(p.segmento).includes(queryNorm);
      const matchPhone = cleanPhoneSearch && cleanPhoneSearch.length >= 3 
        ? p.telefone.replace(/\D/g, '').includes(cleanPhoneSearch)
        : false;

      if (!matchLoja && !matchCode && !matchResp && !matchBairro && !matchEnd && !matchSeg && !matchPhone) {
        return false;
      }
    }

    if (filtroStatus === 'todos') return true;
    return p.status === filtroStatus;
  });

  const totalConsignadoNaRua = pdvs.reduce((acc, p) => acc + p.totalPecasNoDisplay, 0);
  const totalValorNaRua = pdvs.reduce((acc, p) => acc + p.valorTotalConsignado, 0);
  const visitasPendentes = pdvs.filter(p => p.status === 'visita_pendente').length;
  const pdvsComPoucoEstoque = pdvs.filter(p => p.totalPecasNoDisplay <= getPDVCapacidadeTotal(p) * 0.5);

  const handleWhatsAppChat = (pdv: PontoDeVenda) => {
    const cleanPhone = pdv.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Olá ${pdv.responsavel}! Tudo bem?\n\nAqui é da *LM3D Chaveiros & Impressão 3D*.\nEstou organizando a rota de visitas para conferência, acerto e reposição de modelos novos no expositor da *${pdv.nomeLoja}*.\n\nPodemos passar aí essa semana? Abraços!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner / Summary */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold mb-2 sm:mb-3 border border-emerald-500/30">
            <Store className="w-3.5 h-3.5" />
            Rede de Pontos Parceiros
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Pontos de Venda & Expositores 3D
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Acompanhe cada comércio parceiro, controle os displays de chaveiros na rua, programe visitas de acerto e sincronize o abastecimento com o estoque do ateliê.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenAbastecerPDV && (
            <button
              type="button"
              onClick={() => onOpenAbastecerPDV(pdvs[0]?.id || '', 'abastecer')}
              className="w-full sm:w-auto px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold rounded-2xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[42px]"
            >
              <Boxes className="w-4 h-4" />
              Repor / Retirar do PDV
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNovoPDV}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Novo Ponto
          </button>
        </div>
      </div>

      {/* Alerta de PDVs com display precisando de reposição */}
      {pdvsComPoucoEstoque.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide">
                {pdvsComPoucoEstoque.length} Loja{pdvsComPoucoEstoque.length > 1 ? 's' : ''} com expositor precisando de abastecimento!
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Os displays estão abaixo de 50% da capacidade ({pdvsComPoucoEstoque.map(p => p.nomeLoja).slice(0, 3).join(', ')}{pdvsComPoucoEstoque.length > 3 ? '...' : ''}).
              </p>
            </div>
          </div>
          {onOpenAbastecerPDV && (
            <button
              type="button"
              onClick={() => onOpenAbastecerPDV(pdvsComPoucoEstoque[0]?.id || '')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-extrabold rounded-xl shadow-xs shrink-0 self-start sm:self-center transition-all flex items-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5" />
              Abastecer Display Agora
            </button>
          )}
        </div>
      )}

      {/* Metric Cards - Optimized for Mobile Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500">Chaveiros na Rua</span>
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 leading-tight">
              {totalConsignadoNaRua} <span className="text-xs sm:text-sm font-semibold text-slate-400">un</span>
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400">Em {pdvs.length} lojas</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500">Mercadoria Rua</span>
            <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 leading-tight">
              {formatCurrency(totalValorNaRua)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400">Preço venda</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-500">Visitas & Acertos Pendentes</span>
            <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 leading-tight">
              {visitasPendentes} pontos
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400">Necessitam conferência</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Main Search Input */}
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="text"
              placeholder="Buscar por loja, responsável, bairro ou código (ex: PDV-01, #02)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpar busca"
              >
                <span className="bg-slate-200 hover:bg-slate-300 rounded-full p-0.5 text-slate-700 flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </span>
              </button>
            )}
          </div>

          {/* Counter and clear */}
          <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {busca.trim() ? (
                <span>
                  Resultados: <strong className="text-emerald-700 font-bold">{pdvsFiltrados.length}</strong> de {pdvs.length}
                </span>
              ) : (
                <span>
                  Total: <strong>{pdvsFiltrados.length}</strong> de {pdvs.length} pontos
                </span>
              )}
            </span>
            {busca.trim() && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline underline-offset-2 ml-1"
              >
                Limpar busca
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto w-full pt-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              filtroStatus === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({pdvs.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('visita_pendente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
              filtroStatus === 'visita_pendente'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Visita Pendente ({visitasPendentes})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus('ativo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
              filtroStatus === 'ativo'
                ? 'bg-emerald-600 text-white font-black'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Em Dia
          </button>
        </div>
      </div>

      {/* Empty State when no PDV matches search */}
      {pdvsFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto my-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Nenhum ponto de venda encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Não encontramos nenhum parceiro correspondente a "{busca}". Tente buscar por nome da loja, responsável, bairro ou código (ex: PDV-01, #02).
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setFiltroStatus('todos');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Limpar busca e filtros
            </button>
          </div>
        </div>
      ) : (
        /* PDVs Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pdvsFiltrados.map((pdv) => {
            const capacidadeTotal = getPDVCapacidadeTotal(pdv);
            const ocupacaoPerc = Math.round((pdv.totalPecasNoDisplay / capacidadeTotal) * 100);
            const pdvCode = formatPDVCode(pdv);
            const qtdDisplaysExtras = pdv.displaysAdicionais?.length || 0;
            const temAvulsas = !!pdv.temPecasAvulsas && (pdv.quantidadePecasAvulsas || 0) > 0;

            return (
              <div
                key={pdv.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3.5">
                  
                  {/* Header Loja */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs tracking-wide">
                          {pdvCode}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {getSegmentoLabel(pdv.segmento)}
                        </span>
                        {qtdDisplaysExtras > 0 && (
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Layers className="w-3 h-3 text-teal-600" />
                            +{qtdDisplaysExtras} Display{qtdDisplaysExtras > 1 ? 's' : ''}
                          </span>
                        )}
                        {temAvulsas && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Package className="w-3 h-3 text-emerald-600" />
                            +{pdv.quantidadePecasAvulsas} Avulsas
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {pdv.nomeLoja}
                      </h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                        <span className="font-semibold text-slate-700">{pdv.responsavel}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onEditarPDV && (
                        <button
                          type="button"
                          onClick={() => onEditarPDV(pdv)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 active:scale-95 rounded-lg border border-transparent hover:border-teal-200 transition-colors"
                          title="Editar dados e modelo de display da loja"
                          aria-label={`Editar dados de ${pdv.nomeLoja}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onExcluirPDV && (
                        <button
                          type="button"
                          onClick={() => setPdvParaExcluir(pdv)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                          title={`Excluir ${pdv.nomeLoja}`}
                          aria-label={`Excluir ${pdv.nomeLoja}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {pdv.status === 'visita_pendente' ? (
                        <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shrink-0 animate-pulse">
                          <Clock className="w-3 h-3" />
                          Visita Pendente
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Em Dia
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Location & Phone */}
                  <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{pdv.endereco} ({pdv.bairroCidade})</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {formatPhone(pdv.telefone)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleWhatsAppChat(pdv)}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Expositor & Displays Status */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-1">
                      <span className="text-slate-600 font-medium flex items-center gap-1 truncate" title={getPDVResumoDisplays(pdv)}>
                        <Store className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{getPDVResumoDisplays(pdv)}</span>
                      </span>
                      <strong className="text-slate-900 font-bold shrink-0">
                        {pdv.totalPecasNoDisplay} / {capacidadeTotal} peças
                      </strong>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ocupacaoPerc < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, ocupacaoPerc)}%` }}
                      />
                    </div>
                  </div>

                  {/* Commission & Value */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Comissão Loja</span>
                      <span className="font-extrabold text-blue-700 text-sm">
                        {pdv.comissaoLojaPorcentagem}% sobre vendas
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Consignado</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatCurrency(pdv.valorTotalConsignado)}
                      </span>
                    </div>
                  </div>

                  {/* Next Visit Date */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                    <span>Próx. Acerto ({pdv.frequenciaAcerto}):</span>
                    <strong className={pdv.status === 'visita_pendente' ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                      {formatShortDate(pdv.dataProximaVisita)}
                    </strong>
                  </div>

                  {/* Detalhes de Peças Avulsas se houver */}
                  {pdv.temPecasAvulsas && (
                    <div className="bg-teal-50/80 border border-teal-200/90 rounded-xl p-2.5 text-[11px] text-teal-900 space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-[10px] uppercase text-teal-800">
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3 text-teal-600" />
                          Peças Avulsas ({pdv.quantidadePecasAvulsas} un)
                        </span>
                        {pdv.itensPecasAvulsas && pdv.itensPecasAvulsas.length > 0 && (
                          <span className="text-teal-700 font-bold lowercase">
                            {pdv.itensPecasAvulsas.length} modelo{pdv.itensPecasAvulsas.length > 1 ? 's' : ''} do estoque
                          </span>
                        )}
                      </div>

                      {pdv.itensPecasAvulsas && pdv.itensPecasAvulsas.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-0.5">
                          {pdv.itensPecasAvulsas.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md text-[10px] border border-teal-200 text-teal-950 font-semibold shadow-2xs"
                            >
                              <strong className="text-teal-600">{item.quantidade}x</strong>
                              <span>{item.produtoNome}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {pdv.descricaoPecasAvulsas && (
                        <p className="text-[10px] text-teal-700 italic">
                          📍 {pdv.descricaoPecasAvulsas}
                        </p>
                      )}
                    </div>
                  )}

                </div>

                {/* Action Buttons */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenNovoAcerto(pdv.id)}
                      className="flex-1 min-h-[42px] py-2 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-4 h-4 shrink-0" />
                      Fazer Acerto / Fechamento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppChat(pdv)}
                      className="min-h-[42px] min-w-[42px] px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-center transition-colors shrink-0"
                      title="Conversar no WhatsApp"
                      aria-label="Abrir WhatsApp da Loja"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>

                  {onOpenAbastecerPDV && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenAbastecerPDV(pdv.id, 'abastecer')}
                        className="min-h-[38px] py-1.5 px-2 bg-teal-50 hover:bg-teal-100 active:scale-[0.98] text-teal-900 border border-teal-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                        title="Enviar novas peças do ateliê para a loja"
                      >
                        <Boxes className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>Abastecer PDV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenAbastecerPDV(pdv.id, 'recolher')}
                        className="min-h-[38px] py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] text-indigo-950 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                        title="Retirar peças do expositor e voltar ao meu estoque"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Retirar p/ Estoque</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação para Excluir PDV */}
      {pdvParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600 font-black text-base">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3>Excluir Ponto de Venda</h3>
              </div>
              <button
                type="button"
                onClick={() => setPdvParaExcluir(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="text-sm font-semibold text-slate-900">
                Tem certeza que deseja excluir o PDV <span className="text-rose-600 font-black">{pdvParaExcluir.nomeLoja}</span>?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Código:</span>
                  <strong className="font-mono text-slate-900">{formatPDVCode(pdvParaExcluir)}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Responsável:</span>
                  <strong className="text-slate-900">{pdvParaExcluir.responsavel}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Peças no Expositor:</span>
                  <strong className="text-slate-900">{pdvParaExcluir.totalPecasNoDisplay} peças ({formatCurrency(pdvParaExcluir.valorTotalConsignado)})</strong>
                </div>
              </div>

              {pdvParaExcluir.totalPecasNoDisplay > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[11px] leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Atenção:</strong> Constam <strong>{pdvParaExcluir.totalPecasNoDisplay} peças</strong> consignadas neste PDV. Ao excluir, a loja deixará de constar na sua rota e lista de displays.
                  </span>
                </div>
              )}

              <p className="text-slate-500 text-[11px]">
                O histórico de acertos já realizados permanecerá salvo nos registros financeiros.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPdvParaExcluir(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onExcluirPDV) {
                    onExcluirPDV(pdvParaExcluir.id);
                  }
                  setPdvParaExcluir(null);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Sim, Excluir PDV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

