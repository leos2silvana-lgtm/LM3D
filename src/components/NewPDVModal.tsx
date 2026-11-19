import React, { useState, useMemo, useEffect } from 'react';
import { PontoDeVenda, Produto3D, SegmentoLoja, TipoExpositor, DisplayAdicional, ItemPecaAvulsa, ItemEstoquePDV } from '../types';
import {
  formatCurrency,
  formatPhone,
  formatProductCode,
  getExpositorCapacidadePadrao,
  getExpositorLabel,
  normalizeSearch,
} from '../utils/formatters';
import {
  X,
  Check,
  Store,
  AlertTriangle,
  Boxes,
  Plus,
  Minus,
  Trash2,
  Layers,
  Package,
  Search,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PecasAvulsasSection } from './PecasAvulsasSection';

interface NewPDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pdv: PontoDeVenda, itensIniciais?: { produtoId: string; quantidade: number }[]) => void;
  produtos?: Produto3D[];
}

type ModoAbastecimentoInicial = 'agora' | 'depois';

export const NewPDVModal: React.FC<NewPDVModalProps> = ({
  isOpen,
  onClose,
  onSave,
  produtos = [],
}) => {
  const [nomeLoja, setNomeLoja] = useState('');
  const [codigo, setCodigo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [segmento, setSegmento] = useState<SegmentoLoja>('papelaria');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairroCidade, setBairroCidade] = useState('');
  const [linkGoogleMaps, setLinkGoogleMaps] = useState('');

  // Displays adicionados manualmente pelo usuário
  const [displays, setDisplays] = useState<{
    id: string;
    nome: string;
    tipo: TipoExpositor;
    capacidade: number;
  }[]>([]);

  // Abastecimento inicial do(s) expositor(es): escolher do estoque agora ou abastecer depois
  const [modoAbastecimento, setModoAbastecimento] = useState<ModoAbastecimentoInicial>(
    produtos.length > 0 ? 'agora' : 'depois'
  );
  const [quantidadesExpositor, setQuantidadesExpositor] = useState<Record<string, number>>({});
  const [buscaEstoque, setBuscaEstoque] = useState('');

  // Peças Avulsas
  const [temPecasAvulsas, setTemPecasAvulsas] = useState(false);
  const [quantidadePecasAvulsas, setQuantidadePecasAvulsas] = useState(0);
  const [descricaoPecasAvulsas, setDescricaoPecasAvulsas] = useState('');
  const [itensPecasAvulsas, setItensPecasAvulsas] = useState<ItemPecaAvulsa[]>([]);

  const [comissaoLojaPorcentagem, setComissaoLojaPorcentagem] = useState(30);
  const [frequenciaAcerto, setFrequenciaAcerto] = useState<'semanal' | 'quinzenal' | 'mensal'>('quinzenal');
  const [observacoes, setObservacoes] = useState('');

  // Validação e confirmação inline (sem window.alert / window.confirm)
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [mostrarBotaoSwitchDepois, setMostrarBotaoSwitchDepois] = useState(false);
  const [confirmarDeficit, setConfirmarDeficit] = useState(false);

  // Resetar estado sempre que o modal abrir
  useEffect(() => {
    if (isOpen) {
      setNomeLoja('');
      setCodigo('');
      setResponsavel('');
      setSegmento('papelaria');
      setTelefone('');
      setEndereco('');
      setBairroCidade('');
      setLinkGoogleMaps('');
      setDisplays([]);
      setModoAbastecimento(produtos.length > 0 ? 'agora' : 'depois');
      setQuantidadesExpositor({});
      setBuscaEstoque('');
      setTemPecasAvulsas(false);
      setQuantidadePecasAvulsas(0);
      setDescricaoPecasAvulsas('');
      setItensPecasAvulsas([]);
      setComissaoLojaPorcentagem(30);
      setFrequenciaAcerto('quinzenal');
      setObservacoes('');
      setErroValidacao(null);
      setMostrarBotaoSwitchDepois(false);
      setConfirmarDeficit(false);
    }
  }, [isOpen, produtos.length]);

  const totalEstoqueAtelie = useMemo(() => {
    return produtos.reduce((acc, p) => acc + (p.estoqueAtelie || 0), 0);
  }, [produtos]);

  const capacidadeExpositores = useMemo(() => {
    return displays.reduce((acc, d) => acc + (d.capacidade || 0), 0);
  }, [displays]);

  const capacidadeTotalCombinada = useMemo(() => {
    const capAvulsas = temPecasAvulsas ? (quantidadePecasAvulsas || 0) : 0;
    return capacidadeExpositores + capAvulsas;
  }, [capacidadeExpositores, temPecasAvulsas, quantidadePecasAvulsas]);

  // Produtos filtrados no seletor do expositor
  const produtosFiltrados = useMemo(() => {
    const q = normalizeSearch(buscaEstoque);
    const list = !q
      ? produtos
      : produtos.filter(
          (p) =>
            normalizeSearch(p.nome).includes(q) ||
            normalizeSearch(formatProductCode(p)).includes(q) ||
            normalizeSearch(p.categoria).includes(q)
        );

    // Ordenar: selecionados ou com estoque primeiro
    return [...list].sort((a, b) => {
      const qa = quantidadesExpositor[a.id] || 0;
      const qb = quantidadesExpositor[b.id] || 0;
      if (qa > 0 && qb === 0) return -1;
      if (qb > 0 && qa === 0) return 1;
      return (b.estoqueAtelie || 0) - (a.estoqueAtelie || 0);
    });
  }, [produtos, buscaEstoque, quantidadesExpositor]);

  // Totais selecionados para o(s) expositor(es)
  const { totalPecasExpositor, valorExpositorSelecionado, itensExpositorArray } = useMemo(() => {
    if (displays.length === 0 || modoAbastecimento === 'depois') {
      return {
        totalPecasExpositor: 0,
        valorExpositorSelecionado: 0,
        itensExpositorArray: [] as { produtoId: string; quantidade: number }[],
      };
    }
    let total = 0;
    let valor = 0;
    const itens: { produtoId: string; quantidade: number }[] = [];
    Object.entries(quantidadesExpositor).forEach(([produtoId, qtd]) => {
      if (qtd > 0) {
        const prod = produtos.find((p) => p.id === produtoId);
        total += qtd;
        valor += qtd * (prod?.precoVenda || 13.0);
        itens.push({ produtoId, quantidade: qtd });
      }
    });
    return {
      totalPecasExpositor: total,
      valorExpositorSelecionado: valor,
      itensExpositorArray: itens,
    };
  }, [displays.length, modoAbastecimento, quantidadesExpositor, produtos]);

  // Totais das peças avulsas (se habilitado)
  const pecasAvulsasAtivas = temPecasAvulsas ? Math.max(0, quantidadePecasAvulsas || 0) : 0;
  const valorAvulsas = useMemo(() => {
    if (!temPecasAvulsas || pecasAvulsasAtivas <= 0) return 0;
    if (itensPecasAvulsas.length > 0) {
      return itensPecasAvulsas.reduce(
        (acc, item) => acc + item.quantidade * (item.precoVenda || 13.0),
        0
      );
    }
    return pecasAvulsasAtivas * 13.0;
  }, [temPecasAvulsas, pecasAvulsasAtivas, itensPecasAvulsas]);

  const totalPecasFinal = totalPecasExpositor + pecasAvulsasAtivas;
  const valorConsignadoFinal = valorExpositorSelecionado + valorAvulsas;

  // Mescla itens do expositor + itens de peças avulsas para dar baixa no estoque
  const itensIniciaisCombinados = useMemo(() => {
    const map = new Map<string, number>();
    itensExpositorArray.forEach((item) => {
      map.set(item.produtoId, (map.get(item.produtoId) || 0) + item.quantidade);
    });
    if (temPecasAvulsas && itensPecasAvulsas.length > 0) {
      itensPecasAvulsas.forEach((item) => {
        if (item.quantidade > 0) {
          map.set(item.produtoId, (map.get(item.produtoId) || 0) + item.quantidade);
        }
      });
    }
    return Array.from(map.entries()).map(([produtoId, quantidade]) => ({
      produtoId,
      quantidade,
    }));
  }, [itensExpositorArray, temPecasAvulsas, itensPecasAvulsas]);

  // Verifica déficit por produto (quantidade combinada maior que estoqueAtelie)
  const itensComDeficit = useMemo(() => {
    return itensIniciaisCombinados
      .map((item) => {
        const prod = produtos.find((p) => p.id === item.produtoId);
        const disponivel = prod?.estoqueAtelie || 0;
        return {
          produtoId: item.produtoId,
          nome: prod?.nome || 'Produto',
          solicitado: item.quantidade,
          disponivel,
          faltando: Math.max(0, item.quantidade - disponivel),
        };
      })
      .filter((i) => i.faltando > 0);
  }, [itensIniciaisCombinados, produtos]);

  const temDeficitEstoque = itensComDeficit.length > 0;
  const excedeCapacidadeExpositor =
    modoAbastecimento === 'agora' &&
    capacidadeExpositores > 0 &&
    totalPecasExpositor > capacidadeExpositores;

  if (!isOpen) return null;

  // Adicionar Expositor/Display Manualmente
  const handleAddDisplay = (tipoPadrao: TipoExpositor = 'balcao_70') => {
    const numero = displays.length + 1;
    const capPadrao = getExpositorCapacidadePadrao(tipoPadrao);
    const tipoLabel =
      tipoPadrao === 'balcao_70'
        ? 'Balcão'
        : tipoPadrao === 'giratorio_72'
        ? 'Giratório'
        : tipoPadrao === 'display_clips'
        ? 'Clips'
        : 'Display';
    const novo = {
      id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome: `${numero}º Expositor - ${tipoLabel}`,
      tipo: tipoPadrao,
      capacidade: capPadrao,
    };
    setDisplays((prev) => [...prev, novo]);
    setErroValidacao(null);
    setMostrarBotaoSwitchDepois(false);
    setConfirmarDeficit(false);
  };

  const handleRemoveDisplay = (id: string) => {
    setDisplays((prev) => prev.filter((d) => d.id !== id));
    setConfirmarDeficit(false);
  };

  const handleUpdateDisplay = (
    id: string,
    updates: Partial<{ nome: string; tipo: TipoExpositor; capacidade: number }>
  ) => {
    setDisplays((prev) =>
      prev.map((d, index) => {
        if (d.id !== id) return d;
        const updated = { ...d, ...updates };
        if (updates.tipo && updates.capacidade === undefined) {
          updated.capacidade = getExpositorCapacidadePadrao(updates.tipo);
          const numero = index + 1;
          const tipoLabel =
            updates.tipo === 'balcao_70'
              ? 'Balcão'
              : updates.tipo === 'giratorio_72'
              ? 'Giratório'
              : updates.tipo === 'display_clips'
              ? 'Clips'
              : 'Display';
          updated.nome = `${numero}º Expositor - ${tipoLabel}`;
        }
        return updated;
      })
    );
  };

  const handleUpdateQtdExpositor = (produtoId: string, novaQtd: number) => {
    const val = Number.isFinite(novaQtd) ? Math.max(0, Math.floor(novaQtd)) : 0;
    setQuantidadesExpositor((prev) => {
      if (val === 0) {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      }
      return { ...prev, [produtoId]: val };
    });
    setErroValidacao(null);
    setMostrarBotaoSwitchDepois(false);
    setConfirmarDeficit(false);
  };

  const handleAjustarAoMaximoDisponivel = () => {
    setQuantidadesExpositor((prev) => {
      const next: Record<string, number> = {};
      Object.entries(prev).forEach(([produtoId, qtd]) => {
        const prod = produtos.find((p) => p.id === produtoId);
        const max = prod?.estoqueAtelie || 0;
        const clamped = Math.min(qtd, max);
        if (clamped > 0) next[produtoId] = clamped;
      });
      return next;
    });
    setConfirmarDeficit(false);
  };

  // Gerenciamento de Peças Avulsas
  const handleTogglePecasAvulsas = (ativo: boolean) => {
    setTemPecasAvulsas(ativo);
    if (ativo) {
      const qtd =
        itensPecasAvulsas.length > 0
          ? itensPecasAvulsas.reduce((acc, i) => acc + i.quantidade, 0)
          : Math.max(0, quantidadePecasAvulsas);
      setQuantidadePecasAvulsas(qtd);
    }
    setErroValidacao(null);
    setMostrarBotaoSwitchDepois(false);
  };

  const handleChangeQtdAvulsas = (novoValor: number) => {
    const val = Number.isFinite(novoValor) ? Math.max(0, Math.floor(novoValor)) : 0;
    setQuantidadePecasAvulsas(val);
    setConfirmarDeficit(false);
  };

  const handleChangeItensAvulsos = (novosItens: ItemPecaAvulsa[]) => {
    setItensPecasAvulsas(novosItens);
    const novoTotal = novosItens.reduce((acc, i) => acc + i.quantidade, 0);
    setQuantidadePecasAvulsas(novoTotal);
    setConfirmarDeficit(false);
  };

  const finalizeSave = (overrideModoDepois = false) => {
    const modoEfetivo: ModoAbastecimentoInicial = overrideModoDepois ? 'depois' : modoAbastecimento;
    const cleanPhone = telefone.replace(/\D/g, '');

    const totalPecasExpositorSave = modoEfetivo === 'depois' ? 0 : totalPecasExpositor;
    const valorExpositorSave = modoEfetivo === 'depois' ? 0 : valorExpositorSelecionado;

    const totalPecasNoDisplaySave = totalPecasExpositorSave + pecasAvulsasAtivas;
    const valorTotalConsignadoSave = valorExpositorSave + valorAvulsas;

    // Configura expositor principal e adicionais
    const tipoExpositor: TipoExpositor = displays.length > 0 ? displays[0].tipo : 'sem_display_pecas';
    const capacidadeExpositor = displays.length > 0 ? displays[0].capacidade : 0;

    // Distribui peças nos displays adicionais se houver abastecimento agora
    let restanteParaDisplays = totalPecasExpositorSave;
    if (displays.length > 0) {
      restanteParaDisplays = Math.max(0, restanteParaDisplays - displays[0].capacidade);
    }

    const displaysAdicionais: DisplayAdicional[] | undefined =
      displays.length > 1
        ? displays.slice(1).map((d) => {
            const alocado =
              modoEfetivo === 'depois'
                ? 0
                : Math.min(d.capacidade, restanteParaDisplays);
            restanteParaDisplays = Math.max(0, restanteParaDisplays - alocado);
            return {
              id: d.id,
              nome: d.nome,
              tipo: d.tipo,
              capacidade: d.capacidade,
              totalPecas: alocado,
            };
          })
        : undefined;

    const itensParaDescontar: ItemEstoquePDV[] | undefined =
      modoEfetivo === 'depois'
        ? temPecasAvulsas && itensPecasAvulsas.length > 0
          ? itensPecasAvulsas
              .filter((i) => i.quantidade > 0)
              .map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade }))
          : undefined
        : itensIniciaisCombinados.length > 0
        ? itensIniciaisCombinados
        : undefined;

    const novoPDV: PontoDeVenda = {
      id: `pdv-${Date.now()}`,
      codigo: codigo.trim().toUpperCase() || undefined,
      nomeLoja: nomeLoja.trim(),
      responsavel: responsavel.trim() || 'Gerente / Proprietário',
      segmento,
      telefone: cleanPhone || '11999999999',
      endereco: endereco.trim() || (linkGoogleMaps.trim() ? 'Localização via Google Maps' : 'Rua Principal'),
      bairroCidade: bairroCidade.trim() || 'São Paulo - SP',
      linkGoogleMaps: linkGoogleMaps.trim() || undefined,
      tipoExpositor,
      capacidadeExpositor,
      displaysAdicionais,
      temPecasAvulsas: temPecasAvulsas && pecasAvulsasAtivas > 0 ? true : undefined,
      quantidadePecasAvulsas: temPecasAvulsas && pecasAvulsasAtivas > 0 ? pecasAvulsasAtivas : undefined,
      descricaoPecasAvulsas:
        temPecasAvulsas && pecasAvulsasAtivas > 0 && descricaoPecasAvulsas.trim()
          ? descricaoPecasAvulsas.trim()
          : undefined,
      itensPecasAvulsas:
        temPecasAvulsas && pecasAvulsasAtivas > 0 && itensPecasAvulsas.length > 0
          ? itensPecasAvulsas
          : undefined,
      itensNoDisplay: itensParaDescontar,
      comissaoLojaPorcentagem,
      status: 'ativo',
      frequenciaAcerto,
      dataUltimaVisita: new Date().toISOString(),
      dataProximaVisita: new Date(
        Date.now() +
          (frequenciaAcerto === 'semanal' ? 7 : frequenciaAcerto === 'quinzenal' ? 14 : 30) * 86400000
      ).toISOString(),
      totalPecasNoDisplay: totalPecasNoDisplaySave,
      valorTotalConsignado: valorTotalConsignadoSave,
      totalVendidoAcumulado: 0,
      observacoes: observacoes.trim() || undefined,
    };

    onSave(novoPDV, itensParaDescontar);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);
    setMostrarBotaoSwitchDepois(false);

    if (!nomeLoja.trim()) {
      setErroValidacao('Por favor, informe o nome do comércio parceiro.');
      return;
    }

    if (displays.length === 0 && (!temPecasAvulsas || pecasAvulsasAtivas <= 0)) {
      setErroValidacao(
        'Por favor, adicione ao menos um expositor/display ou adicione peças avulsas para este PDV.'
      );
      return;
    }

    if (
      displays.length > 0 &&
      modoAbastecimento === 'agora' &&
      totalPecasExpositor === 0 &&
      pecasAvulsasAtivas === 0
    ) {
      setErroValidacao(
        'Escolha ao menos 1 peça do estoque para o expositor ou selecione "Abastecer Depois" para cadastrar o expositor vazio.'
      );
      setMostrarBotaoSwitchDepois(true);
      return;
    }

    if (temDeficitEstoque && !confirmarDeficit) {
      setConfirmarDeficit(true);
      return;
    }

    finalizeSave(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
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
                onChange={(e) => {
                  setNomeLoja(e.target.value);
                  if (erroValidacao) setErroValidacao(null);
                }}
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
                <option value="padaria">Padaria</option>
                <option value="mercado">Mercado</option>
                <option value="loja_24h">24 Horas</option>
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
                Endereço (Escrever)
              </label>
              <input
                type="text"
                placeholder="Rua, número"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                maxLength={300}
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
                maxLength={150}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Link do Google Maps (Opcional)
              </label>
              <input
                type="url"
                placeholder="https://maps.app.goo.gl/... ou https://www.google.com/maps/..."
                value={linkGoogleMaps}
                onChange={(e) => setLinkGoogleMaps(e.target.value)}
                maxLength={500}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Cole o link compartilhado do Google Maps para abrir a rota exata no botão &quot;Ir / Rota&quot; do card.
              </p>
            </div>

            {/* Configuração de Expositores e Abastecimento Inicial */}
            <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Estrutura de Displays & Peças do PDV
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Adicione os expositores físicos e escolha as peças do estoque ou deixe para abastecer depois
                  </p>
                </div>

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

              {/* Estado Vazio */}
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
                      Adicione o expositor abaixo para já escolher as peças do seu estoque ou salvar para abastecer depois:
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddDisplay('balcao_70')}
                      className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Expositor / Display
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePecasAvulsas(true)}
                      className="px-3 py-2 text-xs font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 rounded-xl shadow-2xs flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Package className="w-4 h-4 text-teal-600" />
                      Adicionar Peças Avulsas
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Expositores Adicionados Manualmente */}
              {displays.map((disp, index) => (
                <div
                  key={disp.id}
                  className="bg-white border-2 border-emerald-200/90 rounded-xl p-3 space-y-2 shadow-2xs animate-in fade-in"
                >
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
                        onChange={(e) =>
                          handleUpdateDisplay(disp.id, { tipo: e.target.value as TipoExpositor })
                        }
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
                        onChange={(e) =>
                          handleUpdateDisplay(disp.id, {
                            capacidade: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* ESCOLHER PEÇAS DO ESTOQUE OU ABASTECER DEPOIS (Exibido imediatamente ao adicionar expositor) */}
              {displays.length > 0 && (
                <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-2xs animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-600" />
                        Abastecimento Inicial do Expositor
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Escolha as peças do estoque agora ou cadastre o expositor para abastecer depois
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-center">
                      Estoque Ateliê: {totalEstoqueAtelie} un
                    </span>
                  </div>

                  {/* Seletor de Modo: Escolher do Estoque vs Abastecer Depois */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModoAbastecimento('agora');
                        setErroValidacao(null);
                        setMostrarBotaoSwitchDepois(false);
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                        modoAbastecimento === 'agora'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          modoAbastecimento === 'agora'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-white border border-slate-200 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black block">Escolher peças do estoque</span>
                        <span className="text-[10px] text-slate-600 block leading-tight mt-0.5">
                          Selecione os modelos e quantidades para já levar no expositor
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModoAbastecimento('depois');
                        setErroValidacao(null);
                        setMostrarBotaoSwitchDepois(false);
                        setConfirmarDeficit(false);
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                        modoAbastecimento === 'depois'
                          ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-2xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          modoAbastecimento === 'depois'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-white border border-slate-200 text-slate-500'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black block">Abastecer depois</span>
                        <span className="text-[10px] text-slate-600 block leading-tight mt-0.5">
                          Salva o PDV com o expositor vazio (0 peças) para preencher depois
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* MODO 1: SELETOR DE PEÇAS DO ESTOQUE */}
                  {modoAbastecimento === 'agora' ? (
                    <div className="space-y-2.5 pt-1">
                      {produtos.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            Seu catálogo de produtos está vazio
                          </div>
                          <p className="text-[11px] text-amber-800">
                            Cadastre modelos na aba <strong>Catálogo & Estoque</strong> ou selecione a opção{' '}
                            <strong>Abastecer depois</strong> para salvar este PDV agora e adicionar as peças mais tarde.
                          </p>
                          <button
                            type="button"
                            onClick={() => setModoAbastecimento('depois')}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg transition-colors"
                          >
                            Selecionar &quot;Abastecer depois&quot;
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Barra de busca + resumo da seleção */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="relative flex-1">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={buscaEstoque}
                                onChange={(e) => setBuscaEstoque(e.target.value)}
                                placeholder="Buscar chaveiro por nome, código (PRD-01) ou categoria..."
                                className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                              />
                              {buscaEstoque && (
                                <button
                                  type="button"
                                  onClick={() => setBuscaEstoque('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {totalPecasExpositor > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuantidadesExpositor({});
                                  setConfirmarDeficit(false);
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                              >
                                Limpar seleção
                              </button>
                            )}
                          </div>

                          {/* Barra de progresso de ocupação do expositor */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">Selecionado p/ Expositor:</span>
                              <span
                                className={`font-black px-2 py-0.5 rounded-md border ${
                                  excedeCapacidadeExpositor
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : totalPecasExpositor > 0
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : 'bg-white text-slate-700 border-slate-200'
                                }`}
                              >
                                {totalPecasExpositor} / {capacidadeExpositores} peças
                              </span>
                            </div>
                            <span className="font-extrabold text-slate-900">
                              {formatCurrency(valorExpositorSelecionado)}
                            </span>
                          </div>

                          {excedeCapacidadeExpositor && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>
                                A quantidade selecionada ({totalPecasExpositor} un) ultrapassa a capacidade configurada dos expositores ({capacidadeExpositores} un).
                              </span>
                            </div>
                          )}

                          {/* Lista de produtos do estoque */}
                          <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                            {produtosFiltrados.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-500">
                                Nenhum produto encontrado para &quot;{buscaEstoque}&quot;.
                              </div>
                            ) : (
                              produtosFiltrados.map((prod) => {
                                const qtd = quantidadesExpositor[prod.id] || 0;
                                const disponivel = prod.estoqueAtelie || 0;
                                const excede = qtd > disponivel;

                                return (
                                  <div
                                    key={prod.id}
                                    className={`p-2.5 flex items-center justify-between gap-2 transition-colors ${
                                      qtd > 0 ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {prod.fotoUrl ? (
                                        <img
                                          src={prod.fotoUrl}
                                          alt={prod.nome}
                                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                                          <Boxes className="w-4 h-4" />
                                        </div>
                                      )}

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                            {formatProductCode(prod)}
                                          </span>
                                          <span className="text-xs font-bold text-slate-900 truncate">
                                            {prod.nome}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                                          <span className="font-semibold text-emerald-700">
                                            {formatCurrency(prod.precoVenda || 13.0)}
                                          </span>
                                          <span>•</span>
                                          <span
                                            className={
                                              excede
                                                ? 'text-rose-600 font-bold'
                                                : disponivel <= 0
                                                ? 'text-amber-600 font-semibold'
                                                : 'text-slate-600 font-medium'
                                            }
                                          >
                                            Disponível: {disponivel} un
                                          </span>
                                          {excede && (
                                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[9px]">
                                              Faltam {qtd - disponivel}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Controles de quantidade */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateQtdExpositor(prod.id, qtd - 1)}
                                          disabled={qtd <= 0}
                                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 rounded-md transition-colors"
                                          aria-label={`Diminuir ${prod.nome}`}
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                          type="number"
                                          min="0"
                                          value={qtd}
                                          onChange={(e) =>
                                            handleUpdateQtdExpositor(prod.id, Number(e.target.value))
                                          }
                                          className="w-10 text-center text-xs font-black text-slate-900 outline-none bg-transparent"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateQtdExpositor(prod.id, qtd + 1)}
                                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                          aria-label={`Aumentar ${prod.nome}`}
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQtdExpositor(prod.id, qtd + 5)}
                                        className="px-1.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-lg border border-slate-200 transition-colors"
                                        title="Adicionar +5 unidades"
                                      >
                                        +5
                                      </button>

                                      {disponivel > 0 && qtd !== disponivel && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateQtdExpositor(prod.id, disponivel)}
                                          className="px-1.5 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                                          title={`Selecionar todo o estoque disponível (${disponivel} un)`}
                                        >
                                          Máx
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    /* MODO 2: ABASTECER DEPOIS */
                    <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-950 animate-in fade-in">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-black text-amber-950">
                          Expositor será salvo vazio (0 peças) para abastecer depois
                        </strong>
                        <span className="text-[11px] text-amber-800 block mt-0.5">
                          Nenhuma peça será descontada do estoque do Ateliê agora. Assim que montar o display, use o botão{' '}
                          <strong>Abastecer PDV</strong> no card da loja para escolher os chaveiros.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Peças Avulsas Fora do Display */}
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

              {/* Resumo da Capacidade Total e Carga Inicial */}
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
                  {displays.length === 0 && (!temPecasAvulsas || pecasAvulsasAtivas === 0) ? (
                    <span className="italic text-slate-400">Nenhum expositor ou peça configurada ainda</span>
                  ) : (
                    <>
                      {displays.map((d, i) => (
                        <span key={d.id} className="font-semibold text-emerald-800">
                          {i > 0 ? '+ ' : ''}
                          {d.nome || getExpositorLabel(d.tipo)} ({d.capacidade})
                        </span>
                      ))}
                      {temPecasAvulsas && pecasAvulsasAtivas > 0 && (
                        <span className="font-semibold text-teal-700">
                          {displays.length > 0 ? '+ ' : ''}
                          {pecasAvulsasAtivas} peças avulsas
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="text-slate-600 font-bold block">Carga Inicial Consignada:</span>
                    <span className="text-[11px] text-slate-500">
                      {displays.length > 0 && modoAbastecimento === 'depois' && pecasAvulsasAtivas === 0
                        ? 'Aguardando 1º abastecimento (0 peças)'
                        : `${totalPecasFinal} peças (${formatCurrency(valorConsignadoFinal)})`}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-black text-xs border ${
                      totalPecasFinal === 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    {totalPecasFinal} peças • {formatCurrency(valorConsignadoFinal)}
                  </span>
                </div>
              </div>

              {/* Alerta de Estoque por Produto (se houver déficit) */}
              {temDeficitEstoque && (
                <div className="p-3 rounded-2xl border bg-rose-50 border-rose-300 text-rose-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs flex-1">
                      <strong className="block font-black text-rose-950">
                        Quantidade excede o estoque pronto no Ateliê
                      </strong>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-rose-800 list-disc list-inside">
                        {itensComDeficit.map((item) => (
                          <li key={item.produtoId}>
                            <strong>{item.nome}</strong>: selecionado {item.solicitado} un, disponível{' '}
                            {item.disponivel} un (faltam {item.faltando} un)
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleAjustarAoMaximoDisponivel}
                      className="px-3 py-1.5 text-[11px] font-bold bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg transition-colors"
                    >
                      Ajustar ao máximo disponível no estoque
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Frequência de Visita/Acerto
              </label>
              <select
                value={frequenciaAcerto}
                onChange={(e) =>
                  setFrequenciaAcerto(e.target.value as 'semanal' | 'quinzenal' | 'mensal')
                }
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

          {/* Erro de Validação Inline */}
          {erroValidacao && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-bold">{erroValidacao}</span>
              </div>
              {mostrarBotaoSwitchDepois && (
                <div className="flex items-center gap-2 pl-6">
                  <button
                    type="button"
                    onClick={() => {
                      setModoAbastecimento('depois');
                      setErroValidacao(null);
                      setMostrarBotaoSwitchDepois(false);
                      finalizeSave(true);
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Abastecer depois e salvar PDV
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confirmação Inline de Déficit de Estoque */}
          {confirmarDeficit && temDeficitEstoque && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black block">
                    Confirmar cadastro com déficit de estoque?
                  </strong>
                  <span className="text-[11px] text-amber-900">
                    Alguns produtos selecionados excedem o estoque pronto no Ateliê. O estoque desses itens ficará zerado até nova produção.
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmarDeficit(false)}
                  className="px-3 py-1.5 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg"
                >
                  Voltar e Ajustar
                </button>
                <button
                  type="button"
                  onClick={() => finalizeSave(false)}
                  className="px-3.5 py-1.5 text-[11px] font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs"
                >
                  Salvar mesmo assim
                </button>
              </div>
            </div>
          )}

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
