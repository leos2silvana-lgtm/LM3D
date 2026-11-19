import React, { useState, useMemo } from 'react';
import { PontoDeVenda, Produto3D, SegmentoLoja, TipoExpositor, DisplayAdicional, ItemPecaAvulsa } from '../types';
import { formatPhone, getExpositorCapacidadePadrao, getExpositorLabel } from '../utils/formatters';
import { X, Check, Store, MapPin, Phone, Percent, AlertTriangle, Boxes, Plus, Trash2, Layers, Package } from 'lucide-react';
import { PecasAvulsasSection } from './PecasAvulsasSection';

interface NewPDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pdv: PontoDeVenda) => void;
  produtos?: Produto3D[];
}

export const NewPDVModal: React.FC<NewPDVModalProps> = ({
  isOpen,
  onClose,
  onSave,
  produtos = [],
}) => {
  if (!isOpen) return null;

  const [nomeLoja, setNomeLoja] = useState('');
  const [codigo, setCodigo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [segmento, setSegmento] = useState<SegmentoLoja>('papelaria');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairroCidade, setBairroCidade] = useState('');
  
  // Displays adicionados manualmente pelo usuário (não vem mais fixo)
  const [displays, setDisplays] = useState<{
    id: string;
    nome: string;
    tipo: TipoExpositor;
    capacidade: number;
  }[]>([]);

  // Peças Avulsas
  const [temPecasAvulsas, setTemPecasAvulsas] = useState(false);
  const [quantidadePecasAvulsas, setQuantidadePecasAvulsas] = useState(15);
  const [descricaoPecasAvulsas, setDescricaoPecasAvulsas] = useState('');
  const [itensPecasAvulsas, setItensPecasAvulsas] = useState<ItemPecaAvulsa[]>([]);

  const [comissaoLojaPorcentagem, setComissaoLojaPorcentagem] = useState(30);
  const [frequenciaAcerto, setFrequenciaAcerto] = useState<'semanal' | 'quinzenal' | 'mensal'>('quinzenal');
  const [totalPecasNoDisplay, setTotalPecasNoDisplay] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  const totalEstoqueAtelie = useMemo(() => {
    return produtos.reduce((acc, p) => acc + (p.estoqueAtelie || 0), 0);
  }, [produtos]);

  // Capacidade total somando os Displays adicionados manualmente + Peças Avulsas
  const capacidadeTotalCombinada = useMemo(() => {
    const capDisplays = displays.reduce((acc, d) => acc + (d.capacidade || 0), 0);
    const capAvulsas = temPecasAvulsas ? (quantidadePecasAvulsas || 0) : 0;
    return capDisplays + capAvulsas;
  }, [displays, temPecasAvulsas, quantidadePecasAvulsas]);

  const temDeficitEstoque = totalPecasNoDisplay > totalEstoqueAtelie;
  const deficitPecas = Math.max(0, totalPecasNoDisplay - totalEstoqueAtelie);

  // Adicionar Expositor/Display Manualmente
  const handleAddDisplay = (tipoPadrao: TipoExpositor = 'balcao_70') => {
    const numero = displays.length + 1;
    const capPadrao = getExpositorCapacidadePadrao(tipoPadrao);
    const tipoLabel = tipoPadrao === 'balcao_70' ? 'Balcão' : tipoPadrao === 'giratorio_72' ? 'Giratório' : tipoPadrao === 'display_clips' ? 'Clips' : 'Display';
    const novo = {
      id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome: `${numero}º Expositor - ${tipoLabel}`,
      tipo: tipoPadrao,
      capacidade: capPadrao,
    };
    setDisplays(prev => [...prev, novo]);
    setTotalPecasNoDisplay(prev => prev + capPadrao);
  };

  const handleRemoveDisplay = (id: string) => {
    const target = displays.find(d => d.id === id);
    const pecasRemovidas = target?.capacidade || 0;
    setDisplays(prev => prev.filter(d => d.id !== id));
    setTotalPecasNoDisplay(prev => Math.max(0, prev - pecasRemovidas));
  };

  const handleUpdateDisplay = (id: string, updates: Partial<{ nome: string; tipo: TipoExpositor; capacidade: number }>) => {
    setDisplays(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, ...updates };
        if (updates.tipo && updates.capacidade === undefined) {
          const novaCap = getExpositorCapacidadePadrao(updates.tipo);
          const diff = novaCap - d.capacidade;
          updated.capacidade = novaCap;
          const index = displays.findIndex(x => x.id === id);
          const numero = index + 1;
          const tipoLabel = updates.tipo === 'balcao_70' ? 'Balcão' : updates.tipo === 'giratorio_72' ? 'Giratório' : updates.tipo === 'display_clips' ? 'Clips' : 'Display';
          updated.nome = `${numero}º Expositor - ${tipoLabel}`;
          setTotalPecasNoDisplay(curr => Math.max(0, curr + diff));
        } else if (updates.capacidade !== undefined) {
          const diff = updates.capacidade - d.capacidade;
          setTotalPecasNoDisplay(curr => Math.max(0, curr + diff));
        }
        return updated;
      }
      return d;
    }));
  };

  // Gerenciamento de Peças Avulsas
  const handleTogglePecasAvulsas = (ativo: boolean) => {
    setTemPecasAvulsas(ativo);
    if (ativo) {
      const qtd = itensPecasAvulsas.length > 0 
        ? itensPecasAvulsas.reduce((acc, i) => acc + i.quantidade, 0)
        : (quantidadePecasAvulsas > 0 ? quantidadePecasAvulsas : 15);
      setQuantidadePecasAvulsas(qtd);
      setTotalPecasNoDisplay(prev => prev + qtd);
    } else {
      setTotalPecasNoDisplay(prev => Math.max(0, prev - quantidadePecasAvulsas));
    }
  };

  const handleChangeQtdAvulsas = (novoValor: number) => {
    const val = Math.max(0, novoValor);
    const diff = val - quantidadePecasAvulsas;
    setQuantidadePecasAvulsas(val);
    if (temPecasAvulsas) {
      setTotalPecasNoDisplay(prev => Math.max(0, prev + diff));
    }
  };

  const handleChangeItensAvulsos = (novosItens: ItemPecaAvulsa[]) => {
    setItensPecasAvulsas(novosItens);
    const novoTotal = novosItens.reduce((acc, i) => acc + i.quantidade, 0);
    const diff = novoTotal - quantidadePecasAvulsas;
    setQuantidadePecasAvulsas(novoTotal);
    if (temPecasAvulsas) {
      setTotalPecasNoDisplay(prev => Math.max(0, prev + diff));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLoja.trim()) {
      alert('Por favor, informe o nome do comércio parceiro.');
      return;
    }

    if (displays.length === 0 && (!temPecasAvulsas || quantidadePecasAvulsas <= 0)) {
      alert('Por favor, adicione ao menos um expositor/display ou adicione peças avulsas para este PDV.');
      return;
    }

    if (temDeficitEstoque && totalEstoqueAtelie > 0) {
      const confirmMsg = `ALERTA DE ESTOQUE:\n\nA carga inicial do display (${totalPecasNoDisplay} peças) excede o total pronto no Ateliê (${totalEstoqueAtelie} peças disponíveis).\nFaltam ${deficitPecas} peças.\n\nDeseja salvar o PDV mesmo assim e agendar a produção restante?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    const cleanPhone = telefone.replace(/\D/g, '');
    const precoMedioChaveiro = 13.00;

    // Configura expositor principal e adicionais a partir da lista manual
    const tipoExpositor: TipoExpositor = displays.length > 0 ? displays[0].tipo : 'sem_display_pecas';
    const capacidadeExpositor = displays.length > 0 ? displays[0].capacidade : 0;
    const displaysAdicionais: DisplayAdicional[] | undefined = displays.length > 1
      ? displays.slice(1).map(d => ({
          id: d.id,
          nome: d.nome,
          tipo: d.tipo,
          capacidade: d.capacidade,
          totalPecas: d.capacidade,
        }))
      : undefined;

    const novoPDV: PontoDeVenda = {
      id: `pdv-${Date.now()}`,
      codigo: codigo.trim().toUpperCase() || undefined,
      nomeLoja: nomeLoja.trim(),
      responsavel: responsavel.trim() || 'Gerente / Proprietário',
      segmento,
      telefone: cleanPhone || '11999999999',
      endereco: endereco.trim() || 'Rua Principal',
      bairroCidade: bairroCidade.trim() || 'São Paulo - SP',
      tipoExpositor,
      capacidadeExpositor,
      displaysAdicionais,
      temPecasAvulsas: temPecasAvulsas && quantidadePecasAvulsas > 0 ? true : undefined,
      quantidadePecasAvulsas: temPecasAvulsas && quantidadePecasAvulsas > 0 ? quantidadePecasAvulsas : undefined,
      descricaoPecasAvulsas: temPecasAvulsas && descricaoPecasAvulsas.trim() ? descricaoPecasAvulsas.trim() : undefined,
      itensPecasAvulsas: temPecasAvulsas && itensPecasAvulsas.length > 0 ? itensPecasAvulsas : undefined,
      comissaoLojaPorcentagem,
      status: 'ativo',
      frequenciaAcerto,
      dataUltimaVisita: new Date().toISOString(),
      dataProximaVisita: new Date(Date.now() + (frequenciaAcerto === 'semanal' ? 7 : frequenciaAcerto === 'quinzenal' ? 14 : 30) * 86400000).toISOString(),
      totalPecasNoDisplay,
      valorTotalConsignado: totalPecasNoDisplay * precoMedioChaveiro,
      totalVendidoAcumulado: 0,
      observacoes: observacoes.trim() || undefined,
    };

    onSave(novoPDV);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Cadastrar Novo Ponto de Venda (PDV)
              </h3>
              <p className="text-xs text-slate-400">
                Instalação de display e chaveiros 3D em consignação
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-slate-800">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Comércio / Loja *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Barbearia Estilo Nobre, Papelaria Central..."
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código do PDV (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: PDV-07, #07"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono uppercase font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Responsável / Lojista
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Oliveira"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp / Telefone
              </label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(formatPhone(e.target.value))}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Segmento do Comércio
              </label>
              <select
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as SegmentoLoja)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="chaveiro">Oficina de Chaveiro</option>
                <option value="barbearia">Barbearia / Salão</option>
                <option value="papelaria">Papelaria & Presentes</option>
                <option value="banca_conveniencia">Banca / Conveniência</option>
                <option value="petshop">Pet Shop & Veterinária</option>
                <option value="tabacaria_presentes">Tabacaria / Variedades</option>
                <option value="loja_games">Loja Geek & Games</option>
                <option value="outro">Outro Segmento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Comissão da Loja (%)
              </label>
              <input
                type="number"
                min="10"
                max="50"
                value={comissaoLojaPorcentagem}
                onChange={(e) => setComissaoLojaPorcentagem(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Endereço
              </label>
              <input
                type="text"
                placeholder="Rua, número"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Bairro e Cidade
              </label>
              <input
                type="text"
                placeholder="Ex: Pinheiros - São Paulo"
                value={bairroCidade}
                onChange={(e) => setBairroCidade(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

          {/* Configuração de Expositores e Peças Avulsas (Adição Manual) */}
          <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Estrutura de Displays & Peças do PDV
                </h4>
                <p className="text-[11px] text-slate-500">
                  Adicione manualmente os expositores físicos e/ou peças avulsas deste parceiro
                </p>
              </div>

              {/* Botões de Ação para Adicionar Manualmente */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddDisplay('balcao_70')}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                  title="Adicionar um expositor/display instalado na loja"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  + Adicionar Expositor
                </button>
                {!temPecasAvulsas && (
                  <button
                    type="button"
                    onClick={() => handleTogglePecasAvulsas(true)}
                    className="px-2.5 py-1.5 text-[11px] font-bold bg-white hover:bg-teal-50 text-teal-700 border border-teal-300 rounded-xl shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                    title="Adicionar peças avulsas fora do expositor (balcão, cestinha, ganchos)"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    + Peças Avulsas
                  </button>
                )}
              </div>
            </div>

            {/* Estado Vazio: Quando nenhum expositor e nenhuma peça avulsa foram adicionados ainda */}
            {displays.length === 0 && !temPecasAvulsas && (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center space-y-3 animate-in fade-in">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Nenhum expositor ou peça adicionada
                  </h5>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                    Escolha abaixo como os chaveiros e produtos serão disponibilizados nesta loja parceira:
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddDisplay('balcao_70')}
                    className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    + Adicionar Expositor / Display
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTogglePecasAvulsas(true)}
                    className="px-3 py-2 text-xs font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded-xl shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Package className="w-4 h-4 text-teal-600" />
                    + Adicionar Peças Avulsas
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Expositores Adicionados Manualmente */}
            {displays.map((disp, index) => (
              <div key={disp.id} className="bg-white border-2 border-emerald-200/90 rounded-xl p-3 space-y-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-1 mr-2">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded uppercase">
                      Expositor #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={disp.nome}
                      onChange={(e) => handleUpdateDisplay(disp.id, { nome: e.target.value })}
                      placeholder="Nome ou identificação do expositor..."
                      className="text-xs font-extrabold text-slate-800 border-b border-dashed border-slate-300 hover:border-slate-500 outline-none px-1 py-0.5 w-full max-w-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDisplay(disp.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                    title="Remover este expositor"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[10px] text-slate-500 hover:text-rose-600">Remover</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Modelo do Expositor
                    </label>
                    <select
                      value={disp.tipo}
                      onChange={(e) => handleUpdateDisplay(disp.id, { tipo: e.target.value as TipoExpositor })}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                    >
                      <option value="balcao_70">Balcão (Capacidade padrão 70 chaveiros)</option>
                      <option value="giratorio_72">Giratório (Capacidade padrão 72 chaveiros)</option>
                      <option value="display_clips">Display para Clips (30 un)</option>
                      <option value="sem_display_pecas">Outro Suporte / Ganchos (50 un)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Capacidade (Peças)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={disp.capacidade}
                      onChange={(e) => handleUpdateDisplay(disp.id, { capacidade: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Peças Avulsas Fora do Display (Com busca no catálogo/estoque) */}
            <PecasAvulsasSection
              produtos={produtos}
              temPecasAvulsas={temPecasAvulsas}
              quantidadePecasAvulsas={quantidadePecasAvulsas}
              descricaoPecasAvulsas={descricaoPecasAvulsas}
              itensPecasAvulsas={itensPecasAvulsas}
              onToggleTemPecasAvulsas={handleTogglePecasAvulsas}
              onChangeQuantidade={handleChangeQtdAvulsas}
              onChangeDescricao={setDescricaoPecasAvulsas}
              onChangeItens={handleChangeItensAvulsos}
            />

            {/* Resumo da Capacidade Total Combinada e Carga Inicial */}
            <div className="bg-slate-100/90 border border-slate-300/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <span className="text-slate-600 font-bold">
                  Capacidade Total da Loja (Displays + Avulsas):
                </span>
                <span className="text-slate-900 font-black text-sm bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {capacidadeTotalCombinada} peças
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span>Composição:</span>
                {displays.length === 0 && (!temPecasAvulsas || quantidadePecasAvulsas === 0) ? (
                  <span className="italic text-slate-400">Nenhum expositor ou peça configurada ainda</span>
                ) : (
                  <>
                    {displays.map((d, i) => (
                      <span key={d.id} className="font-semibold text-emerald-800">
                        {i > 0 ? '+ ' : ''}{d.nome || getExpositorLabel(d.tipo)} ({d.capacidade})
                      </span>
                    ))}
                    {temPecasAvulsas && quantidadePecasAvulsas > 0 && (
                      <span className="font-semibold text-teal-700">
                        {displays.length > 0 ? '+ ' : ''}{quantidadePecasAvulsas} peças avulsas
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Carga Inicial de Peças a Consignar no PDV
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalPecasNoDisplay}
                    onChange={(e) => setTotalPecasNoDisplay(Number(e.target.value))}
                    className={`w-full sm:w-48 px-3 py-1.5 text-xs font-black border rounded-xl outline-none ${
                      temDeficitEstoque
                        ? 'border-rose-300 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTotalPecasNoDisplay(capacidadeTotalCombinada)}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-lg shadow-2xs self-start sm:self-end"
                >
                  Preencher com Capacidade Total ({capacidadeTotalCombinada})
                </button>
              </div>
            </div>

            {/* Alerta de Sincronização com Estoque do Ateliê */}
            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 ${
              temDeficitEstoque
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {temDeficitEstoque ? (
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Boxes className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                {temDeficitEstoque ? (
                  <div>
                    <strong className="block font-black text-rose-900">
                      Alerta de Estoque: Carga maior que estoque disponível!
                    </strong>
                    <span>
                      Você definiu <strong>{totalPecasNoDisplay} peças</strong> para o PDV, mas o Ateliê só tem <strong>{totalEstoqueAtelie} peças</strong> prontas no total (faltam {deficitPecas} un).
                    </span>
                  </div>
                ) : (
                  <div>
                    <strong className="block font-bold text-emerald-900">
                      Estoque Sincronizado com o Ateliê
                    </strong>
                    <span>
                      Há <strong>{totalEstoqueAtelie} peças</strong> prontas no Ateliê disponíveis para abastecer os {totalPecasNoDisplay} ganchos/espaços da loja.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Frequência de Visita/Acerto
              </label>
              <select
                value={frequenciaAcerto}
                onChange={(e) => setFrequenciaAcerto(e.target.value as 'semanal' | 'quinzenal' | 'mensal')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                <option value="semanal">Semanal (7 dias)</option>
                <option value="quinzenal">Quinzenal (15 dias)</option>
                <option value="mensal">Mensal (30 dias)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Observações do Ponto de Venda
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Melhor dia de visita, preferência de modelos..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
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
              Salvar Ponto de Venda
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
