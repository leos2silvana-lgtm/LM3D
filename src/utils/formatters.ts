import {
  CategoriaProduto3D,
  ConfiguracaoCalculadora3D,
  FechamentoAcerto,
  PontoDeVenda,
  Produto3D,
  SegmentoLoja,
  TipoExpositor,
} from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatPercent(value: number): string {
  return `${(value || 0).toFixed(1).replace('.', ',')}%`;
}

export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatPhone(phone: string): string {
  const cleaned = (phone || '').replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function normalizeSearch(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function formatPDVCode(pdv: PontoDeVenda): string {
  if (pdv.codigo && pdv.codigo.trim()) {
    return pdv.codigo.trim().toUpperCase();
  }
  const digits = (pdv.id || '').replace(/\D/g, '');
  const suffix = digits ? digits.slice(-2).padStart(2, '0') : '01';
  return `PDV-${suffix}`;
}

export function formatProductCode(prod: Produto3D): string {
  if (prod.codigo && prod.codigo.trim()) {
    return prod.codigo.trim().toUpperCase();
  }
  const digits = (prod.id || '').replace(/\D/g, '');
  const suffix = digits ? digits.slice(-2).padStart(2, '0') : '01';
  return `PRD-${suffix}`;
}

export function getSegmentoLabel(segmento: SegmentoLoja | string): string {
  const labels: Record<string, string> = {
    papelaria: 'Papelaria & Presentes',
    chaveiro: 'Oficina de Chaveiro',
    barbearia: 'Barbearia / Salão',
    banca_conveniencia: 'Banca / Conveniência',
    petshop: 'Pet Shop & Vet',
    tabacaria_presentes: 'Tabacaria / Variedades',
    loja_games: 'Loja Geek & Games',
    padaria: 'Padaria',
    mercado: 'Mercado',
    loja_24h: '24 Horas',
    outro: 'Comércio Parceiro',
  };
  return labels[segmento] || 'Comércio Parceiro';
}

export function getExpositorLabel(tipo: TipoExpositor | string): string {
  const labels: Record<string, string> = {
    balcao_70: 'Expositor Balcão (70 un)',
    giratorio_72: 'Expositor Giratório (72 un)',
    display_clips: 'Display para Clips (30 un)',
    sem_display_pecas: 'Peças Avulsas / Ganchos',
  };
  return labels[tipo] || 'Expositor Balcão';
}

export function getExpositorCapacidadePadrao(tipo: TipoExpositor): number {
  switch (tipo) {
    case 'balcao_70':
      return 70;
    case 'giratorio_72':
      return 72;
    case 'display_clips':
      return 30;
    case 'sem_display_pecas':
      return 50;
    default:
      return 70;
  }
}

export function getPDVCapacidadeTotal(pdv: PontoDeVenda): number {
  const capPrincipal = pdv.capacidadeExpositor || 0;
  const capExtras = (pdv.displaysAdicionais || []).reduce(
    (acc, d) => acc + (d.capacidade || 0),
    0
  );
  const capAvulsas = pdv.temPecasAvulsas ? pdv.quantidadePecasAvulsas || 0 : 0;
  const total = capPrincipal + capExtras + capAvulsas;
  return total > 0 ? total : 1;
}

export function getPDVResumoDisplays(pdv: PontoDeVenda): string {
  const partes: string[] = [];
  if (pdv.capacidadeExpositor > 0) {
    partes.push(getExpositorLabel(pdv.tipoExpositor));
  }
  if (pdv.displaysAdicionais && pdv.displaysAdicionais.length > 0) {
    partes.push(`+${pdv.displaysAdicionais.length} Display(s)`);
  }
  if (pdv.temPecasAvulsas && (pdv.quantidadePecasAvulsas || 0) > 0) {
    partes.push(`+${pdv.quantidadePecasAvulsas} Avulsas`);
  }
  return partes.length > 0 ? partes.join(' • ') : 'Sem expositor definido';
}

export function getCategoriaLabel(cat: CategoriaProduto3D | string): { label: string; cor: string } {
  const map: Record<string, { label: string; cor: string }> = {
    chaveiro_articulado: {
      label: 'Articulado (Flexi)',
      cor: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    chaveiro_automotivo: {
      label: 'Motos & Carros',
      cor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    chaveiro_geek: {
      label: 'Geek & Games',
      cor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    chaveiro_personalizado: {
      label: 'Letras & Nomes',
      cor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    chaveiro_pet: {
      label: 'Pets & Cachorros',
      cor: 'bg-pink-50 text-pink-700 border-pink-200',
    },
    suporte_3d: {
      label: 'Suportes & Gadgets',
      cor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    chaveiro_religioso: {
      label: 'Religiosos',
      cor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    },
    decorativo_miniatura: {
      label: 'Miniaturas 3D',
      cor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  };

  return (
    map[cat] || {
      label: 'Produto 3D',
      cor: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  );
}

export function calculate3DCost(config: ConfiguracaoCalculadora3D) {
  const custoFilamento = ((config.precoFilamentoKg || 0) / 1000) * (config.pesoGramas || 0);
  const custoEnergia =
    ((config.potenciaWatts || 0) / 1000) *
    ((config.tempoMinutos || 0) / 60) *
    (config.tarifaKwh || 0);
  const custoFerragem = config.custoArgolaCorrente || 0;
  const custoEmbalagem = config.custoEmbalagemTag || 0;
  const custoTotalProducao = custoFilamento + custoEnergia + custoFerragem + custoEmbalagem;

  const comissaoLojaValor =
    ((config.precoVendaConsumidor || 0) * (config.comissaoLojistaPorcento || 0)) / 100;
  const valorLiquidoLM3D = (config.precoVendaConsumidor || 0) - comissaoLojaValor;
  const lucroLiquidoLM3D = valorLiquidoLM3D - custoTotalProducao;
  const margemLucroLM3D =
    config.precoVendaConsumidor > 0
      ? (lucroLiquidoLM3D / config.precoVendaConsumidor) * 100
      : 0;

  return {
    custoFilamento,
    custoEnergia,
    custoFerragem,
    custoEmbalagem,
    custoTotalProducao,
    comissaoLojaValor,
    valorLiquidoLM3D,
    lucroLiquidoLM3D,
    margemLucroLM3D,
  };
}

export function generateWhatsAppReceipt(acerto: FechamentoAcerto): string {
  const vendidos = acerto.itens.filter((i) => i.qtdVendida > 0);
  let msg = `*COMPROVANTE DE ACERTO - LM3D CONSIGNADOS*\n`;
  msg += `Codigo: *${acerto.codigoAcerto}*\n`;
  msg += `Loja: *${acerto.pdvNome}*\n`;
  msg += `Data: ${formatShortDate(acerto.dataAcerto)}\n`;
  msg += `--------------------------------\n`;
  msg += `*ITENS VENDIDOS:*\n`;

  if (vendidos.length === 0) {
    msg += `Nenhuma venda registrada nesta visita.\n`;
  } else {
    vendidos.forEach((item) => {
      msg += `- ${item.qtdVendida}x ${item.produtoNome} = ${formatCurrency(item.subtotalVendido)}\n`;
    });
  }

  msg += `--------------------------------\n`;
  msg += `Total vendido: *${acerto.totalPecasVendidas} pecas* (${formatCurrency(acerto.valorBrutoVendido)})\n`;
  msg += `Comissao Loja (${acerto.comissaoLojaPorcentagem}%): -${formatCurrency(acerto.comissaoLojaValor)}\n`;
  msg += `*Liquido LM3D: ${formatCurrency(acerto.valorLiquidoLM3D)}*\n`;
  if (acerto.totalPecasRepostas > 0) {
    msg += `Reposicao no display: +${acerto.totalPecasRepostas} pecas\n`;
  }
  msg += `--------------------------------\n`;
  msg += `Obrigado pela parceria!`;

  return encodeURIComponent(msg);
}

export function generateWhatsAppRestockReceipt(
  pdv: PontoDeVenda,
  itens: { produtoNome: string; quantidade: number; precoUnitario: number }[],
  novoTotal: number
): string {
  const totalPecas = itens.reduce((acc, i) => acc + i.quantidade, 0);
  let msg = `*COMPROVANTE DE ABASTECIMENTO - LM3D CONSIGNADOS*\n`;
  msg += `Loja: *${pdv.nomeLoja}*\n`;
  msg += `Data: ${formatShortDate(new Date().toISOString())}\n`;
  msg += `--------------------------------\n`;
  msg += `*PECAS ADICIONADAS AO DISPLAY:*\n`;

  itens.forEach((item) => {
    msg += `+ ${item.quantidade}x ${item.produtoNome} (${formatCurrency(item.precoUnitario)}/un)\n`;
  });

  msg += `--------------------------------\n`;
  msg += `Total enviado: *+${totalPecas} pecas*\n`;
  msg += `Saldo atualizado no display: *${novoTotal} pecas*\n`;
  msg += `Boas vendas!`;

  return encodeURIComponent(msg);
}

export function generateWhatsAppReturnReceipt(
  pdv: PontoDeVenda,
  itens: { produtoNome: string; quantidade: number; precoUnitario: number }[],
  novoTotal: number,
  observacao?: string
): string {
  const totalPecas = itens.reduce((acc, i) => acc + i.quantidade, 0);
  let msg = `*COMPROVANTE DE RECOLHIMENTO - LM3D CONSIGNADOS*\n`;
  msg += `Loja: *${pdv.nomeLoja}*\n`;
  msg += `Data: ${formatShortDate(new Date().toISOString())}\n`;
  msg += `--------------------------------\n`;
  msg += `*PECAS RETIRADAS DO DISPLAY:*\n`;

  itens.forEach((item) => {
    msg += `- ${item.quantidade}x ${item.produtoNome}\n`;
  });

  msg += `--------------------------------\n`;
  msg += `Total retirado: *${totalPecas} pecas*\n`;
  msg += `Saldo restante no display: *${novoTotal} pecas*\n`;
  if (observacao && observacao.trim()) {
    msg += `Obs.: ${observacao.trim()}\n`;
  }

  return encodeURIComponent(msg);
}
