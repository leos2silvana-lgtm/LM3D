import React, { useState, useEffect, useMemo } from 'react';
import { PontoDeVenda, SegmentoLoja, TipoExpositor, StatusPDV, DisplayAdicional, Produto3D, ItemPecaAvulsa } from '../types';
import { formatPhone, getExpositorCapacidadePadrao, getExpositorLabel } from '../utils/formatters';
import { X, Check, Store, MapPin, Phone, Percent, ShieldCheck, Trash2, AlertTriangle, Plus, Layers, Package } from 'lucide-react';
import { PecasAvulsasSection } from './PecasAvulsasSection';

interface EditPDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdv: PontoDeVenda | null;
  onSave: (updatedPdv: PontoDeVenda) => void;
  onDelete?: (pdvId: string) => void;
  produtos?: Produto3D[];
}

export const EditPDVModal: React.FC<EditPDVModalProps> = ({
  isOpen,
  onClose,
  pdv,
  onSave,
  onDelete,
  produtos = [],
}) => {
  if (!isOpen || !pdv) return null;

  const [nomeLoja, setNomeLoja] = useState(pdv.nomeLoja);
  const [codigo, setCodigo] = useState(pdv.codigo || '');
  const [responsavel, setResponsavel] = useState(pdv.responsavel);
  const [segmento, setSegmento] = useState<SegmentoLoja>(pdv.segmento);
  const [telefone, setTelefone] = useState(pdv.telefone);
  const [endereco, setEndereco] = useState(pdv.endereco);
  const [bairroCidade, setBairroCidade] = useState(pdv.bairroCidade);
  
  // Expositor Principal
  const [tipoExpositor, setTipoExpositor] = useState<TipoExpositor>(pdv.tipoExpositor);
  const [capacidadeExpositor, setCapacidadeExpositor] = useState(pdv.capacidadeExpositor);

  // Displays Adicionais
  const [displaysAdicionais, setDisplaysAdicionais] = useState<DisplayAdicional[]>(pdv.displaysAdicionais || []);

  // Peças Avulsas
  const [temPecasAvulsas, setTemPecasAvulsas] = useState(!!pdv.temPecasAvulsas);
  const [quantidadePecasAvulsas, setQuantidadePecasAvulsas] = useState(pdv.quantidadePecasAvulsas || 15);
  const [descricaoPecasAvulsas, setDescricaoPecasAvulsas] = useState(pdv.descricaoPecasAvulsas || '');
  const [itensPecasAvulsas, setItensPecasAvulsas] = useState<ItemPecaAvulsa[]>(pdv.itensPecasAvulsas || []);

  const [totalPecasNoDisplay, setTotalPecasNoDisplay] = useState(pdv.totalPecasNoDisplay);
  const [comissaoLojaPorcentagem, setComissaoLojaPorcentagem] = useState(pdv.comissaoLojaPorcentagem);
  const [status, setStatus] = useState<StatusPDV>(pdv.status);
  const [frequenciaAcerto, setFrequenciaAcerto] = useState<'semanal' | 'quinzenal' | 'mensal'>(pdv.frequenciaAcerto);
  const [chavePixLoja, setChavePixLoja] = useState(pdv.chavePixLoja || '');
  const [observacoes, setObservacoes] = useState(pdv.observacoes || '');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (pdv) {
      setNomeLoja(pdv.nomeLoja);
      setCodigo(pdv.codigo || '');
      setResponsavel(pdv.responsavel);
      setSegmento(pdv.segmento);
      setTelefone(pdv.telefone);
      setEndereco(pdv.endereco);
      setBairroCidade(pdv.bairroCidade);
      setTipoExpositor(pdv.tipoExpositor);
      setCapacidadeExpositor(pdv.capacidadeExpositor);
      setDisplaysAdicionais(pdv.displaysAdicionais || []);
      setTemPecasAvulsas(!!pdv.temPecasAvulsas);
      setQuantidadePecasAvulsas(pdv.quantidadePecasAvulsas || 15);
      setDescricaoPecasAvulsas(pdv.descricaoPecasAvulsas || '');
      setItensPecasAvulsas(pdv.itensPecasAvulsas || []);
      setTotalPecasNoDisplay(pdv.totalPecasNoDisplay);
      setComissaoLojaPorcentagem(pdv.comissaoLojaPorcentagem);
      setStatus(pdv.status);
      setFrequenciaAcerto(pdv.frequenciaAcerto);
      setChavePixLoja(pdv.chavePixLoja || '');
      setObservacoes(pdv.observacoes || '');
      setShowConfirmDelete(false);
    }
  }, [pdv]);

  const capacidadeTotalCombinada = useMemo(() => {
    const capExtras = displaysAdicionais.reduce((acc, d) => acc + (d.capacidade || 0), 0);
    const capAvulsas = temPecasAvulsas ? (quantidadePecasAvulsas || 0) : 0;
    return capacidadeExpositor + capExtras + capAvulsas;
  }, [capacidadeExpositor, displaysAdicionais, temPecasAvulsas, quantidadePecasAvulsas]);

  const handleExpositorChange = (tipo: TipoExpositor) => {
    setTipoExpositor(tipo);
    const capPadrao = getExpositorCapacidadePadrao(tipo);
    setCapacidadeExpositor(capPadrao);
  };

  const handleAddDisplayAdicional = () => {
    const novoTipo: TipoExpositor = 'giratorio_72';
    const novaCap = getExpositorCapacidadePadrao(novoTipo);
    const numero = displaysAdicionais.length + 2;
    const novo: DisplayAdicional = {
      id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome: `${numero}º Display - Giratório`,
      tipo: novoTipo,
      capacidade: novaCap,
      totalPecas: novaCap,
    };
    setDisplaysAdicionais(prev => [...prev, novo]);
  };

  const handleRemoveDisplayAdicional = (id: string) => {
    setDisplaysAdicionais(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateDisplayAdicional = (id: string, updates: Partial<DisplayAdicional>) => {
    setDisplaysAdicionais(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, ...updates };
        if (updates.tipo && !updates.capacidade) {
          const novaCap = getExpositorCapacidadePadrao(updates.tipo);
          updated.capacidade = novaCap;
          updated.totalPecas = novaCap;
          const numero = displaysAdicionais.findIndex(x => x.id === id) + 2;
          updated.nome = `${numero}º Display - ${updates.tipo === 'balcao_70' ? 'Balcão' : updates.tipo === 'giratorio_72' ? 'Giratório' : updates.tipo === 'display_clips' ? 'Clips' : 'Display'}`;
        }
        return updated;
      }
      return d;
    }));
  };

  const handleTogglePecasAvulsas = (ativo: boolean) => {
    setTemPecasAvulsas(ativo);
    if (ativo) {
      const qtd = itensPecasAvulsas.length > 0
        ? itensPecasAvulsas.reduce((acc, i) => acc + i.quantidade, 0)
        : (quantidadePecasAvulsas > 0 ? quantidadePecasAvulsas : 15);
      setQuantidadePecasAvulsas(qtd);
    }
  };

  const handleChangeItensAvulsos = (novosItens: ItemPecaAvulsa[]) => {
    setItensPecasAvulsas(novosItens);
    const novoTotal = novosItens.reduce((acc, i) => acc + i.quantidade, 0);
    setQuantidadePecasAvulsas(novoTotal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLoja.trim()) return;

    const updated: PontoDeVenda = {
      ...pdv,
      codigo: codigo.trim() ? codigo.trim().toUpperCase() : pdv.codigo,
      nomeLoja: nomeLoja.trim(),
      responsavel: responsavel.trim() || 'Gerente / Proprietário',
      segmento,
      telefone: telefone.trim(),
      endereco: endereco.trim() || 'Balcão da Loja',
      bairroCidade: bairroCidade.trim() || 'Centro',
      tipoExpositor,
      capacidadeExpositor,
      displaysAdicionais: displaysAdicionais.length > 0 ? displaysAdicionais : undefined,
      temPecasAvulsas: temPecasAvulsas && quantidadePecasAvulsas > 0 ? true : undefined,
      quantidadePecasAvulsas: temPecasAvulsas && quantidadePecasAvulsas > 0 ? quantidadePecasAvulsas : undefined,
      descricaoPecasAvulsas: temPecasAvulsas && descricaoPecasAvulsas.trim() ? descricaoPecasAvulsas.trim() : undefined,
      itensPecasAvulsas: temPecasAvulsas && itensPecasAvulsas.length > 0 ? itensPecasAvulsas : undefined,
      totalPecasNoDisplay,
      valorTotalConsignado: totalPecasNoDisplay * 13.00,
      comissaoLojaPorcentagem,
      status,
      frequenciaAcerto,
      chavePixLoja: chavePixLoja.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Editar Ponto de Venda
              </h3>
              <p className="text-xs text-slate-400">
                Ajuste os dados da loja, modelo do display e comissão
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-800">
          
          {/* Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Estabelecimento *
              </label>
              <input
                type="text"
                required
                value={nomeLoja}
                onChange={(e) => setNomeLoja(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código / SKU
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-extrabold uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Responsável / Contato
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Segmento Comercial
              </label>
              <select
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as SegmentoLoja)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="papelaria">Papelaria & Presentes</option>
                <option value="chaveiro">Oficina de Chaveiro</option>
                <option value="barbearia">Barbearia / Salão</option>
                <option value="banca_conveniencia">Banca / Conveniência</option>
                <option value="petshop">Pet Shop & Veterinária</option>
                <option value="tabacaria_presentes">Tabacaria / Variedades</option>
                <option value="loja_games">Loja Geek & Games</option>
                <option value="outro">Outro Ponto Comercial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                WhatsApp de Contato
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status da Loja
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPDV)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold"
              >
                <option value="ativo">Em Dia (Ativo)</option>
                <option value="visita_pendente">Visita Pendente</option>
                <option value="em_negociacao">Em Negociação</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
          </div>

          {/* Estrutura de Displays & Peças do PDV */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Estrutura de Displays & Peças do PDV
                </h4>
                <p className="text-[11px] text-slate-500">
                  Gerencie o expositor principal, adicione outros displays ou controle peças avulsas
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddDisplayAdicional}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-white hover:bg-teal-50 text-teal-700 border border-teal-300 rounded-xl shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                  title="Adicionar mais um display instalado na loja"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-600" />
                  + Outro Display
                </button>
                {!temPecasAvulsas && (
                  <button
                    type="button"
                    onClick={() => handleTogglePecasAvulsas(true)}
                    className="px-2.5 py-1.5 text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                    title="Adicionar peças avulsas fora do expositor"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    + Peças Avulsas
                  </button>
                )}
              </div>
            </div>

            {/* 1. Expositor Principal */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-teal-600" />
                  Expositor Principal
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  Capacidade: {capacidadeExpositor} un
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Modelo do Expositor Principal
                  </label>
                  <select
                    value={tipoExpositor}
                    onChange={(e) => handleExpositorChange(e.target.value as TipoExpositor)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
                  >
                    <option value="balcao_70">Balcão (Capacidade padrão 70 chaveiros)</option>
                    <option value="giratorio_72">Giratório (Capacidade padrão 72 chaveiros)</option>
                    <option value="display_clips">Display para Clips (Capacidade 30 un)</option>
                    <option value="sem_display_pecas">Sem Display Físico (Apenas Peças)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Capacidade (Peças)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacidadeExpositor}
                    onChange={(e) => setCapacidadeExpositor(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Displays Adicionais */}
            {displaysAdicionais.map((disp, index) => (
              <div key={disp.id} className="bg-white border-2 border-teal-200/90 rounded-xl p-3 space-y-2 shadow-2xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-1 mr-2">
                    <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[10px] font-black rounded uppercase">
                      Display #{index + 2}
                    </span>
                    <input
                      type="text"
                      value={disp.nome}
                      onChange={(e) => handleUpdateDisplayAdicional(disp.id, { nome: e.target.value })}
                      placeholder="Nome do display adicional..."
                      className="text-xs font-extrabold text-slate-800 border-b border-dashed border-slate-300 hover:border-slate-500 outline-none px-1 py-0.5 w-full max-w-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDisplayAdicional(disp.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remover este display adicional"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Modelo do Display Adicional
                    </label>
                    <select
                      value={disp.tipo}
                      onChange={(e) => handleUpdateDisplayAdicional(disp.id, { tipo: e.target.value as TipoExpositor })}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-slate-50"
                    >
                      <option value="giratorio_72">Giratório Extra (72 chaveiros)</option>
                      <option value="balcao_70">Balcão Extra (70 chaveiros)</option>
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
                      onChange={(e) => handleUpdateDisplayAdicional(disp.id, { capacidade: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* 3. Peças Avulsas Fora do Display (Com busca no catálogo/estoque) */}
            <PecasAvulsasSection
              produtos={produtos}
              temPecasAvulsas={temPecasAvulsas}
              quantidadePecasAvulsas={quantidadePecasAvulsas}
              descricaoPecasAvulsas={descricaoPecasAvulsas}
              itensPecasAvulsas={itensPecasAvulsas}
              onToggleTemPecasAvulsas={handleTogglePecasAvulsas}
              onChangeQuantidade={(val) => setQuantidadePecasAvulsas(Math.max(0, val))}
              onChangeDescricao={setDescricaoPecasAvulsas}
              onChangeItens={handleChangeItensAvulsos}
            />

            {/* Resumo da Capacidade Total Combinada */}
            <div className="bg-slate-100/90 border border-slate-300/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <span className="text-slate-600 font-bold">
                  Capacidade Total Instalada na Loja:
                </span>
                <span className="text-slate-900 font-black text-sm bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  {capacidadeTotalCombinada} peças
                </span>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span>Composição:</span>
                <span className="font-semibold text-slate-700">1x {getExpositorLabel(tipoExpositor).split(' ')[0]} ({capacidadeExpositor})</span>
                {displaysAdicionais.map((d) => (
                  <span key={d.id} className="font-semibold text-teal-700">
                    + 1x {d.nome || getExpositorLabel(d.tipo)} ({d.capacidade})
                  </span>
                ))}
                {temPecasAvulsas && quantidadePecasAvulsas > 0 && (
                  <span className="font-semibold text-emerald-700">
                    + {quantidadePecasAvulsas} avulsas
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Peças Atuais no PDV
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalPecasNoDisplay}
                  onChange={(e) => setTotalPecasNoDisplay(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-black text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Comissão da Loja (%)
                </label>
                <div className="flex items-center gap-1">
                  {[25, 30, 35].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setComissaoLojaPorcentagem(pct)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        comissaoLojaPorcentagem === pct
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Frequência de Visita / Acerto
              </label>
              <select
                value={frequenciaAcerto}
                onChange={(e) => setFrequenciaAcerto(e.target.value as 'semanal' | 'quinzenal' | 'mensal')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="semanal">Semanal (a cada 7 dias)</option>
                <option value="quinzenal">Quinzenal (a cada 14 dias)</option>
                <option value="mensal">Mensal (a cada 30 dias)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Chave PIX do Lojista
              </label>
              <input
                type="text"
                placeholder="Ex: CNPJ, celular ou e-mail"
                value={chavePixLoja}
                onChange={(e) => setChavePixLoja(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Observações & Preferências
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                title="Excluir este ponto de venda"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir PDV
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </div>

        </form>

        {/* Modal de Confirmação de Exclusão dentro da Edição */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl border border-rose-200 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <h4>Excluir Ponto de Venda</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <p>
                  Tem certeza que deseja excluir o PDV <strong className="text-slate-900 font-bold">{pdv.nomeLoja}</strong>?
                </p>

                {pdv.totalPecasNoDisplay > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-[11px] leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Constam <strong>{pdv.totalPecasNoDisplay} peças</strong> consignadas neste PDV.
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Esta loja deixará de constar na lista de PDVs e rotas de visitas.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete) {
                      onDelete(pdv.id);
                    }
                    setShowConfirmDelete(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
