import React, { useState } from 'react';
import { Produto3D, CategoriaProduto3D } from '../types';
import { 
  formatCurrency, 
  formatPercent, 
  getCategoriaLabel,
  formatProductCode,
  normalizeSearch
} from '../utils/formatters';
import { 
  Package, 
  Plus, 
  Search, 
  Clock, 
  Weight, 
  Boxes, 
  Sparkles, 
  TrendingUp,
  Tag,
  Palette,
  X,
  Hash,
  ClipboardCheck,
  SlidersHorizontal,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface ProductsTabProps {
  produtos: Produto3D[];
  onOpenNovoProduto: () => void;
  onOpenInventario?: () => void;
  onAjustarEstoqueProduto?: (produto: Produto3D) => void;
  onEditarProduto?: (produto: Produto3D) => void;
  onExcluirProduto?: (produtoId: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  produtos,
  onOpenNovoProduto,
  onOpenInventario,
  onAjustarEstoqueProduto,
  onEditarProduto,
  onExcluirProduto,
}) => {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto3D | null>(null);

  const queryNorm = normalizeSearch(busca);

  const produtosFiltrados = produtos.filter(p => {
    if (queryNorm) {
      const code = formatProductCode(p);
      const matchName = normalizeSearch(p.nome).includes(queryNorm);
      const matchCode = normalizeSearch(p.codigo || '').includes(queryNorm) || 
                        normalizeSearch(code).includes(queryNorm) ||
                        normalizeSearch(p.id).includes(queryNorm);
      const matchDesc = normalizeSearch(p.descricao).includes(queryNorm);
      const matchCat = normalizeSearch(p.categoria).includes(queryNorm) ||
                       normalizeSearch(getCategoriaLabel(p.categoria).label).includes(queryNorm);
      const matchColors = p.coresPopulares?.some(c => normalizeSearch(c).includes(queryNorm));

      if (!matchName && !matchCode && !matchDesc && !matchCat && !matchColors) {
        return false;
      }
    }

    if (categoriaAtiva === 'todas') return true;
    return p.categoria === categoriaAtiva;
  });

  const totalPecasAtelie = produtos.reduce((acc, p) => acc + p.estoqueAtelie, 0);
  const totalPecasRua = produtos.reduce((acc, p) => acc + p.totalConsignado, 0);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-2 sm:mb-3 border border-teal-500/30">
            <Package className="w-3.5 h-3.5" />
            Catálogo & Fabricação 3D
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Chaveiros & Produtos Impressos em 3D
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Modelos desenvolvidos para revenda consignada: articulados (flexi), automotivos, geeks, letras e suportes com alta margem de lucro.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {onOpenInventario && (
            <button
              type="button"
              onClick={onOpenInventario}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-teal-500/30 text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[42px]"
              title="Fazer contagem física de estoque e corrigir diferenças"
            >
              <ClipboardCheck className="w-4 h-4 text-teal-400" />
              Fazer Inventário / Balanço
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNovoProduto}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            Novo Produto 3D
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500">Modelos Cadastrados</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 leading-tight">
            {produtos.length} <span className="text-xs sm:text-sm font-semibold text-slate-400">modelos</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Prontos p/ impressão</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-teal-700">Estoque no Ateliê</span>
              {onOpenInventario && (
                <button
                  type="button"
                  onClick={onOpenInventario}
                  className="text-[10px] font-black text-teal-600 hover:text-teal-800 underline flex items-center gap-0.5"
                >
                  <ClipboardCheck className="w-3 h-3" />
                  Balanço
                </button>
              )}
            </div>
            <div className="text-lg sm:text-2xl font-black text-teal-600 mt-1 leading-tight">
              {totalPecasAtelie} <span className="text-xs sm:text-sm font-semibold text-slate-400">peças</span>
            </div>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Pronta reposição</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[11px] sm:text-xs font-bold text-emerald-700">Em Consignação nos PDVs</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-1 leading-tight">
            {totalPecasRua} <span className="text-xs sm:text-sm font-semibold text-slate-400">peças</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Gerando vendas nos parceiros</span>
        </div>
      </div>

      {/* Search Bar & Category Filter Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Main Search Input */}
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4 text-teal-600" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome (ex: Dragão, Moto) ou código (ex: PRD-01, #02)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-500 rounded-xl focus:ring-2 focus:ring-teal-500/20 outline-none transition-all placeholder:text-slate-400"
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

          {/* Results Counter & Clear action */}
          <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {busca.trim() ? (
                <span>
                  Resultados: <strong className="text-teal-700 font-bold">{produtosFiltrados.length}</strong> de {produtos.length}
                </span>
              ) : (
                <span>
                  Exibindo <strong>{produtosFiltrados.length}</strong> de {produtos.length} modelos
                </span>
              )}
            </span>
            {busca.trim() && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="text-xs font-bold text-teal-600 hover:text-teal-800 underline underline-offset-2 ml-1"
              >
                Limpar busca
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'todas', label: 'Todos os Produtos' },
            { id: 'chaveiro_articulado', label: 'Articulados (Flexi)' },
            { id: 'chaveiro_automotivo', label: 'Motos & Carros' },
            { id: 'chaveiro_geek', label: 'Geek & Games' },
            { id: 'chaveiro_personalizado', label: 'Letras & Nomes' },
            { id: 'chaveiro_pet', label: 'Pets & Cachorros' },
            { id: 'suporte_3d', label: 'Suportes & Gadgets' },
            { id: 'chaveiro_religioso', label: 'Religiosos' },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaAtiva(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                categoriaAtiva === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State when no product matches search */}
      {produtosFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-4 max-w-md mx-auto my-8 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Nenhum produto 3D encontrado
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Não encontramos nenhum item correspondente a "{busca}". Tente buscar por nome (ex: Dragão, Moto) ou código (ex: PRD-01, #02).
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setBusca('');
                setCategoriaAtiva('todas');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              Limpar busca e filtros
            </button>
          </div>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {produtosFiltrados.map((prod) => {
            const catInfo = getCategoriaLabel(prod.categoria);
            const prodCode = formatProductCode(prod);
            // Assuming 30% average store cut:
            const repasseLM3D = prod.precoVenda * 0.70;
            const lucroUnitario = repasseLM3D - prod.custoProducao;
            const margemLucro = repasseLM3D > 0 ? (lucroUnitario / repasseLM3D) * 100 : 0;

            return (
              <div
                key={prod.id}
                className="bg-white border border-slate-200 hover:border-teal-400 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  
                  {/* Badge Category, Product Code & Highlight */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs tracking-wide">
                        {prodCode}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${catInfo.cor}`}>
                        {catInfo.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {prod.destaque && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 rounded-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Mais Vendido
                        </span>
                      )}

                      {onEditarProduto && (
                        <button
                          type="button"
                          onClick={() => onEditarProduto(prod)}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-teal-700 hover:bg-teal-50 active:scale-95 rounded-lg border border-slate-200 hover:border-teal-200 transition-colors bg-white shadow-2xs"
                          title={`Editar ${prod.nome}`}
                          aria-label={`Editar ${prod.nome}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onExcluirProduto && (
                        <button
                          type="button"
                          onClick={() => setProdutoParaExcluir(prod)}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors bg-white shadow-2xs"
                          title={`Excluir ${prod.nome} do catálogo`}
                          aria-label={`Excluir ${prod.nome} do catálogo`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    {prod.fotoUrl && (
                      <div className="w-full h-40 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs mb-3">
                        <img
                          src={prod.fotoUrl}
                          alt={prod.nome}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <h3 className="text-base font-extrabold text-slate-900">
                      {prod.nome}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {prod.descricao}
                    </p>
                  </div>

                  {/* Popular Colors */}
                  {prod.coresPopulares && prod.coresPopulares.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Palette className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {prod.coresPopulares.map((cor, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {cor}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 3D Specs (Weight, Machine Time) */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Weight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prod.pesoGramas}g filamento</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>~{prod.tempoImpressaoMin} min impr.</span>
                    </div>
                  </div>

                  {/* Price & Margins */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Preço Venda (Consumidor):</span>
                      <strong className="text-lg font-black text-slate-900">
                        {formatCurrency(prod.precoVenda)}
                      </strong>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Custo Total Produção:</span>
                      <span className="font-semibold text-rose-600">
                        {formatCurrency(prod.custoProducao)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs pt-1 border-t border-dashed border-slate-200">
                      <span className="text-slate-600 font-medium">Lucro Líquido LM3D (após 30% loja):</span>
                      <strong className="text-emerald-600 font-black">
                        +{formatCurrency(lucroUnitario)} ({margemLucro.toFixed(0)}%)
                      </strong>
                    </div>
                  </div>

                </div>

                {/* Stock breakdown & Quick Adjust */}
                <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50/90 -mx-5 -mb-5 px-5 py-3 rounded-b-3xl">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-600">
                      Ateliê: <strong className="text-slate-900 font-extrabold">{prod.estoqueAtelie} un.</strong>
                    </span>
                    {onAjustarEstoqueProduto && (
                      <button
                        type="button"
                        onClick={() => onAjustarEstoqueProduto(prod)}
                        className="px-2 py-0.5 text-[10px] font-black text-teal-700 bg-white hover:bg-teal-50 active:scale-95 border border-teal-300 rounded-md transition-all shadow-2xs flex items-center gap-1"
                        title={`Ajustar estoque de ${prod.nome}`}
                        aria-label={`Ajustar estoque de ${prod.nome}`}
                      >
                        <SlidersHorizontal className="w-2.5 h-2.5 text-teal-600" />
                        Ajustar
                      </button>
                    )}
                  </div>
                  <span className="text-slate-600 text-right">
                    Consignado: <strong className="text-teal-700 font-bold">{prod.totalConsignado} un.</strong>
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação para Excluir Produto do Catálogo */}
      {produtoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600 font-black text-base">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3>Excluir Produto do Catálogo</h3>
              </div>
              <button
                type="button"
                onClick={() => setProdutoParaExcluir(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="text-sm font-semibold text-slate-900">
                Tem certeza que deseja excluir o produto <span className="text-rose-600 font-black">{produtoParaExcluir.nome}</span>?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Código:</span>
                  <strong className="font-mono text-slate-900">{formatProductCode(produtoParaExcluir)}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Categoria:</span>
                  <strong className="text-slate-900">{getCategoriaLabel(produtoParaExcluir.categoria).label}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Preço de Venda:</span>
                  <strong className="text-slate-900">{formatCurrency(produtoParaExcluir.precoVenda)}</strong>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Estoque no Ateliê:</span>
                  <strong className="text-slate-900">{produtoParaExcluir.estoqueAtelie} un.</strong>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span>Total Consignado (Lojas):</span>
                  <strong className="text-teal-700 font-black">{produtoParaExcluir.totalConsignado} un.</strong>
                </div>
              </div>

              {produtoParaExcluir.totalConsignado > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-[11px] leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Atenção:</strong> Constam <strong>{produtoParaExcluir.totalConsignado} unidades</strong> deste produto atualmente consignadas nas lojas parceiras. Ao excluir do catálogo, o modelo deixará de aparecer para novas reposições.
                  </span>
                </div>
              )}

              <p className="text-slate-500 text-[11px]">
                Esta ação removerá o modelo do catálogo de produtos e cálculos de fabricação 3D.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProdutoParaExcluir(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onExcluirProduto) {
                    onExcluirProduto(produtoParaExcluir.id);
                  }
                  setProdutoParaExcluir(null);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Sim, Excluir Produto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
