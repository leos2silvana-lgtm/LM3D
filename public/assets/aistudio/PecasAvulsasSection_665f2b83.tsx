import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Produto3D, ItemPecaAvulsa } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  AlertTriangle, 
  Boxes, 
  Sparkles, 
  X, 
  Check, 
  Tag
} from 'lucide-react';

interface PecasAvulsasSectionProps {
  produtos: Produto3D[];
  temPecasAvulsas: boolean;
  quantidadePecasAvulsas: number;
  descricaoPecasAvulsas: string;
  itensPecasAvulsas: ItemPecaAvulsa[];
  onToggleTemPecasAvulsas: (ativo: boolean) => void;
  onChangeQuantidade: (novaQtd: number) => void;
  onChangeDescricao: (novaDesc: string) => void;
  onChangeItens: (novosItens: ItemPecaAvulsa[]) => void;
}

export const PecasAvulsasSection: React.FC<PecasAvulsasSectionProps> = ({
  produtos = [],
  temPecasAvulsas,
  quantidadePecasAvulsas,
  descricaoPecasAvulsas,
  itensPecasAvulsas = [],
  onToggleTemPecasAvulsas,
  onChangeQuantidade,
  onChangeDescricao,
  onChangeItens,
}) => {
  const [buscaProduto, setBuscaProduto] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de busca ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtragem de produtos do catálogo
  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto.trim()) {
      return produtos.slice(0, 10);
    }
    const q = buscaProduto.toLowerCase().trim();
    return produtos.filter(p => 
      p.nome.toLowerCase().includes(q) ||
      (p.codigo && p.codigo.toLowerCase().includes(q)) ||
      p.categoria.toLowerCase().includes(q)
    );
  }, [produtos, buscaProduto]);

  // Total de peças somando os itens selecionados
  const totalPecasItens = useMemo(() => {
    return itensPecasAvulsas.reduce((acc, i) => acc + (i.quantidade || 0), 0);
  }, [itensPecasAvulsas]);

  // Valor total das peças avulsas
  const valorTotalAvulsas = useMemo(() => {
    return itensPecasAvulsas.reduce((acc, i) => {
      const preco = i.precoVenda || 13.00;
      return acc + (preco * i.quantidade);
    }, (itensPecasAvulsas.length === 0 ? quantidadePecasAvulsas * 13.00 : 0));
  }, [itensPecasAvulsas, quantidadePecasAvulsas]);

  // Adicionar produto do estoque às peças avulsas
  const handleAddProduto = (prod: Produto3D) => {
    const itemExistente = itensPecasAvulsas.find(i => i.produtoId === prod.id);
    let novosItens: ItemPecaAvulsa[];

    if (itemExistente) {
      novosItens = itensPecasAvulsas.map(i => {
        if (i.produtoId === prod.id) {
          return { ...i, quantidade: i.quantidade + 1 };
        }
        return i;
      });
    } else {
      const novoItem: ItemPecaAvulsa = {
        produtoId: prod.id,
        produtoNome: prod.nome,
        quantidade: 1,
        codigo: prod.codigo,
        fotoUrl: prod.fotoUrl,
        precoVenda: prod.precoVenda,
        categoria: prod.categoria,
      };
      novosItens = [...itensPecasAvulsas, novoItem];
    }

    onChangeItens(novosItens);
    const novoTotal = novosItens.reduce((acc, i) => acc + i.quantidade, 0);
    onChangeQuantidade(novoTotal);
    setBuscaProduto('');
    setIsSearchOpen(false);
  };

  // Alterar quantidade de um item avulso
  const handleUpdateItemQtd = (produtoId: string, novaQtd: number) => {
    const qtd = Math.max(1, novaQtd);
    const novosItens = itensPecasAvulsas.map(i => {
      if (i.produtoId === produtoId) {
        return { ...i, quantidade: qtd };
      }
      return i;
    });
    onChangeItens(novosItens);
    const novoTotal = novosItens.reduce((acc, i) => acc + i.quantidade, 0);
    onChangeQuantidade(novoTotal);
  };

  // Remover item avulso
  const handleRemoveItem = (produtoId: string) => {
    const novosItens = itensPecasAvulsas.filter(i => i.produtoId !== produtoId);
    onChangeItens(novosItens);
    const novoTotal = novosItens.reduce((acc, i) => acc + i.quantidade, 0);
    onChangeQuantidade(novoTotal);
  };

  // Preencher descrição automaticamente com a lista de produtos
  const handleAutoPreencherDescricao = () => {
    if (itensPecasAvulsas.length === 0) return;
    const resumoItens = itensPecasAvulsas
      .map(i => `${i.quantidade}x ${i.produtoNome}`)
      .join(', ');
    const descAtual = descricaoPecasAvulsas.trim();
    if (descAtual) {
      onChangeDescricao(`${descAtual} (${resumoItens})`);
    } else {
      onChangeDescricao(`Avulsos: ${resumoItens}`);
    }
  };

  if (!temPecasAvulsas) return null;

  return (
    <div className="bg-white border-2 border-teal-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-2xs animate-in fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-teal-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-teal-950 block">
              Peças Avulsas Consignadas (Fora do Display)
            </span>
            <span className="text-[10px] text-teal-700 font-medium">
              Chaveiros em cestinha, balcão, caixa ou ganchos próprios da loja
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleTemPecasAvulsas(false)}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs flex items-center gap-1 shrink-0"
          title="Remover peças avulsas deste PDV"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold hidden sm:inline text-rose-600">Remover Avulsas</span>
        </button>
      </div>

      {/* SELETOR / BUSCA DE PRODUTOS CADASTRADOS DO ESTOQUE */}
      <div className="space-y-1.5" ref={searchContainerRef}>
        <div className="flex items-center justify-between gap-1">
          <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-teal-600" />
            Buscar Produto Cadastrado do Estoque
          </label>
          <span className="text-[10px] text-slate-500 font-semibold">
            {produtos.length} produtos cadastrados
          </span>
        </div>

        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={buscaProduto}
              onChange={(e) => {
                setBuscaProduto(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Digite o nome, código (ex: PRD-01) ou categoria do produto..."
              className="w-full pl-9 pr-9 py-2 text-xs font-semibold bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-teal-500 rounded-xl focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            />
            {buscaProduto && (
              <button
                type="button"
                onClick={() => setBuscaProduto('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DROPDOWN FLUTUANTE DE PRODUTOS */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
              <div className="p-2 bg-slate-50/80 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Clique para adicionar ao PDV</span>
                <span>{produtosFiltrados.length} encontrados</span>
              </div>

              {produtosFiltrados.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhum produto cadastrado encontrado para "{buscaProduto}".
                </div>
              ) : (
                produtosFiltrados.map((prod) => {
                  const jaAdicionado = itensPecasAvulsas.find(i => i.produtoId === prod.id);
                  const semEstoque = (prod.estoqueAtelie || 0) <= 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleAddProduto(prod)}
                      className={`p-2.5 hover:bg-teal-50/80 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        jaAdicionado ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {prod.fotoUrl ? (
                          <img
                            src={prod.fotoUrl}
                            alt={prod.nome}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                            <Boxes className="w-4 h-4 text-slate-400" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {prod.codigo && (
                              <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {prod.codigo}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {prod.nome}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-emerald-700">
                              {formatCurrency(prod.precoVenda || 13.00)}
                            </span>
                            <span>•</span>
                            <span className={semEstoque ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'}>
                              Estoque Ateliê: {prod.estoqueAtelie || 0} un
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {jaAdicionado ? (
                          <span className="px-2 py-1 text-[10px] font-extrabold text-teal-800 bg-teal-100 border border-teal-300 rounded-lg flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {jaAdicionado.quantidade} un
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-100 hover:bg-teal-200 active:scale-95 rounded-lg border border-teal-300 transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* LISTA DE PRODUTOS AVULSOS ADICIONADOS */}
      {itensPecasAvulsas.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-teal-600" />
              Produtos Selecionados para Avulso ({itensPecasAvulsas.length} modelos)
            </span>
            <button
              type="button"
              onClick={handleAutoPreencherDescricao}
              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
              title="Copiar lista de modelos para o campo de observação"
            >
              <Sparkles className="w-3 h-3 text-teal-600" />
              Preencher no detalhe
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {itensPecasAvulsas.map((item) => {
              const prodOriginal = produtos.find(p => p.id === item.produtoId);
              const estoqueDisponivel = prodOriginal?.estoqueAtelie || 0;
              const excedeEstoque = item.quantidade > estoqueDisponivel && estoqueDisponivel > 0;

              return (
                <div
                  key={item.produtoId}
                  className="bg-slate-50 border border-slate-200/90 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.fotoUrl ? (
                      <img
                        src={item.fotoUrl}
                        alt={item.produtoNome}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                        <Boxes className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.codigo && (
                          <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                            {item.codigo}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.produtoNome}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>{formatCurrency(item.precoVenda || 13.00)}/un</span>
                        <span>•</span>
                        <span className={excedeEstoque ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                          Estoque Ateliê: {estoqueDisponivel} un
                        </span>
                        {excedeEstoque && (
                          <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1 py-0.2 rounded flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Excede
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controles de Quantidade */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQtd(item.produtoId, item.quantidade - 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        disabled={item.quantidade <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => handleUpdateItemQtd(item.produtoId, Number(e.target.value))}
                        className="w-10 text-center text-xs font-black text-slate-900 outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQtd(item.produtoId, item.quantidade + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.produtoId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remover produto da lista de avulsos"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantidade Total e Localização */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div>
          <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
            Qtd Total de Avulsas
          </label>
          <input
            type="number"
            min="0"
            value={itensPecasAvulsas.length > 0 ? totalPecasItens : quantidadePecasAvulsas}
            onChange={(e) => onChangeQuantidade(Math.max(0, Number(e.target.value)))}
            className="w-full px-3 py-1.5 text-xs font-black text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            placeholder="0"
          />
          {itensPecasAvulsas.length > 0 && (
            <span className="text-[9px] text-teal-700 font-bold block mt-0.5">
              Somado dos {itensPecasAvulsas.length} modelos acima
            </span>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[10px] font-black text-slate-700 uppercase mb-1">
            Localização / Detalhe das Avulsas
          </label>
          <input
            type="text"
            placeholder="Ex: Cestinha no balcão do caixa, ganchos próprios da loja..."
            value={descricaoPecasAvulsas}
            onChange={(e) => onChangeDescricao(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
      </div>

      {/* Barra de Resumo das Peças Avulsas */}
      <div className="bg-teal-50/80 border border-teal-200/90 rounded-xl px-3 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-teal-950">
            Total Avulso:
          </span>
          <span className="font-black text-teal-900 bg-white px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs">
            {itensPecasAvulsas.length > 0 ? totalPecasItens : quantidadePecasAvulsas} peças
          </span>
          {itensPecasAvulsas.length > 0 && (
            <span className="text-[10px] text-teal-700 font-semibold">
              ({itensPecasAvulsas.length} produtos do estoque)
            </span>
          )}
        </div>

        <div className="text-[11px] font-extrabold text-teal-900">
          Valor Consignado Avulso: {formatCurrency(valorTotalAvulsas)}
        </div>
      </div>
    </div>
  );
};
