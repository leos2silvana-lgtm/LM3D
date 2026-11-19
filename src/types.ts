export type SegmentoLoja =
  | 'papelaria'
  | 'chaveiro'
  | 'barbearia'
  | 'banca_conveniencia'
  | 'petshop'
  | 'tabacaria_presentes'
  | 'loja_games'
  | 'padaria'
  | 'mercado'
  | 'loja_24h'
  | 'outro';

export type TipoExpositor =
  | 'balcao_70'
  | 'giratorio_72'
  | 'display_clips'
  | 'sem_display_pecas';

export type StatusPDV =
  | 'ativo'
  | 'visita_pendente'
  | 'em_negociacao'
  | 'pausado';

export type CategoriaProduto3D =
  | 'chaveiro_articulado'
  | 'chaveiro_automotivo'
  | 'chaveiro_geek'
  | 'chaveiro_personalizado'
  | 'chaveiro_pet'
  | 'suporte_3d'
  | 'chaveiro_religioso'
  | 'decorativo_miniatura';

export type StatusPagamentoAcerto =
  | 'pago_pix'
  | 'pago_dinheiro'
  | 'pago_cartao'
  | 'pendente_a_receber';

export type MotivoAjusteEstoque =
  | 'producao_concluida'
  | 'contagem_inventario'
  | 'perda_defeito'
  | 'venda_direta_atelie'
  | 'ajuste_manual';

export interface DisplayAdicional {
  id: string;
  nome: string;
  tipo: TipoExpositor;
  capacidade: number;
  totalPecas: number;
}

export interface ItemPecaAvulsa {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  codigo?: string;
  fotoUrl?: string;
  precoVenda?: number;
  categoria?: CategoriaProduto3D | string;
}

export interface ItemEstoquePDV {
  produtoId: string;
  quantidade: number;
}

export interface PontoDeVenda {
  id: string;
  codigo?: string;
  nomeLoja: string;
  responsavel: string;
  segmento: SegmentoLoja;
  telefone: string;
  endereco: string;
  bairroCidade: string;
  linkGoogleMaps?: string;
  tipoExpositor: TipoExpositor;
  capacidadeExpositor: number;
  displaysAdicionais?: DisplayAdicional[];
  temPecasAvulsas?: boolean;
  quantidadePecasAvulsas?: number;
  descricaoPecasAvulsas?: string;
  itensPecasAvulsas?: ItemPecaAvulsa[];
  itensNoDisplay?: ItemEstoquePDV[];
  comissaoLojaPorcentagem: number;
  status: StatusPDV;
  frequenciaAcerto: 'semanal' | 'quinzenal' | 'mensal';
  dataUltimaVisita: string;
  dataProximaVisita: string;
  totalPecasNoDisplay: number;
  valorTotalConsignado: number;
  totalVendidoAcumulado: number;
  chavePixLoja?: string;
  observacoes?: string;
}

export interface Produto3D {
  id: string;
  codigo?: string;
  nome: string;
  categoria: CategoriaProduto3D;
  descricao: string;
  precoVenda: number;
  custoProducao: number;
  pesoGramas: number;
  tempoImpressaoMin: number;
  estoqueAtelie: number;
  totalConsignado: number;
  coresPopulares?: string[];
  destaque?: boolean;
  fotoUrl?: string;
}

export interface ItemAcertoConsignacao {
  produtoId: string;
  produtoNome: string;
  produtoFoto?: string;
  categoria: string;
  precoUnitario: number;
  custoUnitario: number;
  qtdAnterior: number;
  qtdRestante: number;
  qtdVendida: number;
  qtdReposta: number;
  subtotalVendido: number;
}

export interface FechamentoAcerto {
  id: string;
  codigoAcerto: string;
  pdvId: string;
  pdvNome: string;
  pdvTelefone: string;
  dataAcerto: string;
  itens: ItemAcertoConsignacao[];
  totalPecasVendidas: number;
  totalPecasRepostas: number;
  valorBrutoVendido: number;
  comissaoLojaPorcentagem: number;
  comissaoLojaValor: number;
  valorLiquidoLM3D: number;
  custoProducaoVendido: number;
  lucroLiquidoLM3D: number;
  statusPagamento: StatusPagamentoAcerto;
  observacoes?: string;
}

export interface ConfiguracaoCalculadora3D {
  precoFilamentoKg: number;
  pesoGramas: number;
  tempoMinutos: number;
  potenciaWatts: number;
  tarifaKwh: number;
  custoArgolaCorrente: number;
  custoEmbalagemTag: number;
  precoVendaConsumidor: number;
  comissaoLojistaPorcento: number;
}

export interface ItemInventario {
  produtoId: string;
  novoEstoque: number;
  diferenca: number;
}

export interface RegistroInventario {
  id: string;
  data: string;
  motivo: string;
  itensAlterados: number;
  saldoDiferenca: number;
  observacoes?: string;
}

export interface UsuarioAdmin {
  email: string;
  nome: string;
  role?: string;
}

export interface SessaoAuth {
  usuario: UsuarioAdmin;
  loggedAt: string;
  remember: boolean;
}
