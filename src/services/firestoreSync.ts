import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  CategoriaProduto3D,
  DisplayAdicional,
  FechamentoAcerto,
  ItemAcertoConsignacao,
  ItemEstoquePDV,
  ItemPecaAvulsa,
  PontoDeVenda,
  Produto3D,
  RegistroInventario,
  SegmentoLoja,
  StatusPagamentoAcerto,
  StatusPDV,
  TipoExpositor,
} from '../types';

const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

const VALID_SEGMENTOS: SegmentoLoja[] = [
  'papelaria',
  'chaveiro',
  'barbearia',
  'banca_conveniencia',
  'petshop',
  'tabacaria_presentes',
  'loja_games',
  'padaria',
  'mercado',
  'loja_24h',
  'outro',
];

const VALID_EXPOSITORES: TipoExpositor[] = [
  'balcao_70',
  'giratorio_72',
  'display_clips',
  'sem_display_pecas',
];

const VALID_STATUS_PDV: StatusPDV[] = [
  'ativo',
  'visita_pendente',
  'em_negociacao',
  'pausado',
];

const VALID_FREQUENCIAS: Array<'semanal' | 'quinzenal' | 'mensal'> = [
  'semanal',
  'quinzenal',
  'mensal',
];

const VALID_CATEGORIAS: CategoriaProduto3D[] = [
  'chaveiro_articulado',
  'chaveiro_automotivo',
  'chaveiro_geek',
  'chaveiro_personalizado',
  'chaveiro_pet',
  'suporte_3d',
  'chaveiro_religioso',
  'decorativo_miniatura',
];

const VALID_STATUS_PAGAMENTO: StatusPagamentoAcerto[] = [
  'pago_pix',
  'pago_dinheiro',
  'pago_cartao',
  'pendente_a_receber',
];

export function sanitizeId(raw: string, prefix: string): string {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}-${Date.now()}`;
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.slice(0, maxLen);
}

function clampNumber(val: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitizeDisplaysAdicionais(list?: DisplayAdicional[]): DisplayAdicional[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map((d, idx) => ({
    id: sanitizeId(d?.id || `disp-${idx}`, 'disp'),
    nome: clampString(d?.nome, 120, `Display ${idx + 2}`),
    tipo: VALID_EXPOSITORES.includes(d?.tipo) ? d.tipo : 'balcao_70',
    capacidade: clampNumber(d?.capacidade, 0, 10000, 70),
    totalPecas: clampNumber(d?.totalPecas, 0, 100000, 0),
  }));
}

function sanitizeItensPecasAvulsas(list?: ItemPecaAvulsa[]): ItemPecaAvulsa[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((i) => i && i.produtoId && Number(i.quantidade) > 0)
    .slice(0, 100)
    .map((i) => ({
      produtoId: sanitizeId(i.produtoId, 'prod'),
      produtoNome: clampString(i.produtoNome, 150, 'Produto 3D'),
      quantidade: clampNumber(i.quantidade, 0, 100000, 0),
      ...(i.codigo ? { codigo: clampString(i.codigo, 40) } : {}),
      ...(i.fotoUrl && i.fotoUrl.length <= 350000 ? { fotoUrl: i.fotoUrl } : {}),
      ...(typeof i.precoVenda === 'number' && Number.isFinite(i.precoVenda)
        ? { precoVenda: clampNumber(i.precoVenda, 0, 100000, 0) }
        : {}),
      ...(i.categoria ? { categoria: clampString(i.categoria, 60) } : {}),
    }));
}

function sanitizeItensNoDisplay(list?: ItemEstoquePDV[]): ItemEstoquePDV[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((i) => i && i.produtoId && Number(i.quantidade) > 0)
    .slice(0, 200)
    .map((i) => ({
      produtoId: sanitizeId(i.produtoId, 'prod'),
      quantidade: clampNumber(i.quantidade, 0, 100000, 0),
    }));
}

export function buildPDVPayload(
  pdv: PontoDeVenda,
  uid: string,
  isCreate: boolean
): Record<string, unknown> {
  const safeId = sanitizeId(pdv.id, 'pdv');
  const safeSegmento = VALID_SEGMENTOS.includes(pdv.segmento) ? pdv.segmento : 'outro';
  const safeTipo = VALID_EXPOSITORES.includes(pdv.tipoExpositor)
    ? pdv.tipoExpositor
    : 'balcao_70';
  const safeStatus = VALID_STATUS_PDV.includes(pdv.status) ? pdv.status : 'ativo';
  const safeFreq = VALID_FREQUENCIAS.includes(pdv.frequenciaAcerto)
    ? pdv.frequenciaAcerto
    : 'quinzenal';

  const base: Record<string, unknown> = {
    nomeLoja: clampString(pdv.nomeLoja, 150, 'Loja Parceira') || 'Loja Parceira',
    responsavel: clampString(pdv.responsavel, 150, ''),
    segmento: safeSegmento,
    telefone: clampString(pdv.telefone, 40, ''),
    endereco: clampString(pdv.endereco, 300, ''),
    bairroCidade: clampString(pdv.bairroCidade, 150, ''),
    linkGoogleMaps: clampString(pdv.linkGoogleMaps, 500, ''),
    tipoExpositor: safeTipo,
    capacidadeExpositor: clampNumber(pdv.capacidadeExpositor, 0, 10000, 0),
    displaysAdicionais: sanitizeDisplaysAdicionais(pdv.displaysAdicionais),
    temPecasAvulsas: Boolean(pdv.temPecasAvulsas),
    quantidadePecasAvulsas: clampNumber(pdv.quantidadePecasAvulsas, 0, 100000, 0),
    descricaoPecasAvulsas: clampString(pdv.descricaoPecasAvulsas, 500, ''),
    itensPecasAvulsas: sanitizeItensPecasAvulsas(pdv.itensPecasAvulsas),
    itensNoDisplay: sanitizeItensNoDisplay(pdv.itensNoDisplay),
    comissaoLojaPorcentagem: clampNumber(pdv.comissaoLojaPorcentagem, 0, 100, 30),
    status: safeStatus,
    frequenciaAcerto: safeFreq,
    dataUltimaVisita: clampString(pdv.dataUltimaVisita, 64, new Date().toISOString()),
    dataProximaVisita: clampString(pdv.dataProximaVisita, 64, new Date().toISOString()),
    totalPecasNoDisplay: clampNumber(pdv.totalPecasNoDisplay, 0, 100000, 0),
    valorTotalConsignado: clampNumber(pdv.valorTotalConsignado, 0, 10000000, 0),
    totalVendidoAcumulado: clampNumber(pdv.totalVendidoAcumulado, 0, 10000000, 0),
    codigo: clampString(pdv.codigo, 40, ''),
    chavePixLoja: clampString(pdv.chavePixLoja, 150, ''),
    observacoes: clampString(pdv.observacoes, 1000, ''),
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    base.id = safeId;
    base.ownerId = uid;
    base.createdAt = serverTimestamp();
  }

  return base;
}

export function buildProdutoPayload(
  prod: Produto3D,
  uid: string,
  isCreate: boolean
): Record<string, unknown> {
  const safeId = sanitizeId(prod.id, 'prod');
  const safeCategoria = VALID_CATEGORIAS.includes(prod.categoria)
    ? prod.categoria
    : 'chaveiro_articulado';
  const safeFoto =
    typeof prod.fotoUrl === 'string' && prod.fotoUrl.length <= 350000 ? prod.fotoUrl : '';
  const safeCores = Array.isArray(prod.coresPopulares)
    ? prod.coresPopulares
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 60))
        .slice(0, 20)
    : [];

  const base: Record<string, unknown> = {
    codigo: clampString(prod.codigo, 40, ''),
    nome: clampString(prod.nome, 150, 'Produto 3D') || 'Produto 3D',
    categoria: safeCategoria,
    descricao: clampString(prod.descricao, 1000, ''),
    precoVenda: clampNumber(prod.precoVenda, 0, 100000, 0),
    custoProducao: clampNumber(prod.custoProducao, 0, 100000, 0),
    pesoGramas: clampNumber(prod.pesoGramas, 0, 50000, 0),
    tempoImpressaoMin: clampNumber(prod.tempoImpressaoMin, 0, 100000, 0),
    estoqueAtelie: clampNumber(prod.estoqueAtelie, 0, 1000000, 0),
    totalConsignado: clampNumber(prod.totalConsignado, 0, 1000000, 0),
    coresPopulares: safeCores,
    destaque: Boolean(prod.destaque),
    fotoUrl: safeFoto,
    updatedAt: serverTimestamp(),
  };

  if (isCreate) {
    base.id = safeId;
    base.ownerId = uid;
    base.createdAt = serverTimestamp();
  }

  return base;
}

function sanitizeItensAcerto(list: ItemAcertoConsignacao[]): ItemAcertoConsignacao[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 200).map((it) => ({
    produtoId: sanitizeId(it?.produtoId || 'prod', 'prod'),
    produtoNome: clampString(it?.produtoNome, 150, 'Produto 3D'),
    ...(it?.produtoFoto && it.produtoFoto.length <= 350000
      ? { produtoFoto: it.produtoFoto }
      : {}),
    categoria: clampString(it?.categoria, 60, 'chaveiro_articulado'),
    precoUnitario: clampNumber(it?.precoUnitario, 0, 100000, 0),
    custoUnitario: clampNumber(it?.custoUnitario, 0, 100000, 0),
    qtdAnterior: clampNumber(it?.qtdAnterior, 0, 100000, 0),
    qtdRestante: clampNumber(it?.qtdRestante, 0, 100000, 0),
    qtdVendida: clampNumber(it?.qtdVendida, 0, 100000, 0),
    qtdReposta: clampNumber(it?.qtdReposta, 0, 100000, 0),
    subtotalVendido: clampNumber(it?.subtotalVendido, 0, 10000000, 0),
  }));
}

export function buildAcertoPayload(
  acerto: FechamentoAcerto,
  uid: string
): Record<string, unknown> {
  const safeId = sanitizeId(acerto.id, 'acerto');
  const safePdvId = sanitizeId(acerto.pdvId, 'pdv');
  const safeStatus = VALID_STATUS_PAGAMENTO.includes(acerto.statusPagamento)
    ? acerto.statusPagamento
    : 'pago_pix';

  return {
    id: safeId,
    ownerId: uid,
    codigoAcerto: clampString(acerto.codigoAcerto, 50, `LM3D-AC-${Date.now()}`) || 'LM3D-AC',
    pdvId: safePdvId,
    pdvNome: clampString(acerto.pdvNome, 150, 'PDV') || 'PDV',
    pdvTelefone: clampString(acerto.pdvTelefone, 40, ''),
    dataAcerto: clampString(acerto.dataAcerto, 64, new Date().toISOString()),
    itens: sanitizeItensAcerto(acerto.itens),
    totalPecasVendidas: clampNumber(acerto.totalPecasVendidas, 0, 100000, 0),
    totalPecasRepostas: clampNumber(acerto.totalPecasRepostas, 0, 100000, 0),
    valorBrutoVendido: clampNumber(acerto.valorBrutoVendido, 0, 10000000, 0),
    comissaoLojaPorcentagem: clampNumber(acerto.comissaoLojaPorcentagem, 0, 100, 30),
    comissaoLojaValor: clampNumber(acerto.comissaoLojaValor, 0, 10000000, 0),
    valorLiquidoLM3D: clampNumber(acerto.valorLiquidoLM3D, 0, 10000000, 0),
    custoProducaoVendido: clampNumber(acerto.custoProducaoVendido, 0, 10000000, 0),
    lucroLiquidoLM3D: clampNumber(acerto.lucroLiquidoLM3D, -10000000, 10000000, 0),
    statusPagamento: safeStatus,
    observacoes: clampString(acerto.observacoes, 1000, ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildInventarioPayload(
  inv: RegistroInventario,
  uid: string
): Record<string, unknown> {
  const safeId = sanitizeId(inv.id, 'inv');
  return {
    id: safeId,
    ownerId: uid,
    data: clampString(inv.data, 64, new Date().toISOString()),
    motivo: clampString(inv.motivo, 150, 'Balanço de inventário') || 'Balanço de inventário',
    itensAlterados: clampNumber(inv.itensAlterados, 0, 10000, 0),
    saldoDiferenca: clampNumber(inv.saldoDiferenca, -1000000, 1000000, 0),
    observacoes: clampString(inv.observacoes, 1000, ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

const ADMIN_EMAILS = [
  'sils2leo@gmail.com',
  'leos2sil@hotmail.com',
  'leos2sil@homtail.com',
  'leos2silvana@gmail.com',
];

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  const normalized = (email || '').trim().toLowerCase();
  return normalized.length > 0 && ADMIN_EMAILS.includes(normalized);
}

export async function ensureUserProfile(user: User): Promise<'admin' | 'user'> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeEmail = clampString(user.email, 254, '');
  const safeName = clampString(user.displayName, 120, safeEmail || 'Administrador LM3D');
  const safePhoto =
    typeof user.photoURL === 'string' && user.photoURL.length <= 2048 ? user.photoURL : undefined;
  const isAdminEmail = isBootstrappedAdminEmail(safeEmail);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (!existingSnap.exists()) {
    const initialRole: 'admin' | 'user' = isAdminEmail ? 'admin' : 'user';
    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: safeEmail,
        displayName: safeName,
        role: initialRole,
        ...(safePhoto ? { photoURL: safePhoto } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
    return initialRole;
  }

  const existingData = existingSnap.data() as { role?: unknown } | undefined;
  const currentRole: 'admin' | 'user' = existingData?.role === 'admin' ? 'admin' : 'user';
  const nextRole: 'admin' | 'user' = isAdminEmail ? 'admin' : currentRole;

  try {
    await updateDoc(userRef, {
      email: safeEmail,
      displayName: safeName,
      ...(safePhoto ? { photoURL: safePhoto } : {}),
      ...(isAdminEmail && existingData?.role !== 'admin' ? { role: 'admin' } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  return nextRole;
}

export async function migrateLocalDataIfCloudEmpty(uid: string): Promise<number> {
  const migrationFlag = `lm3d_cloud_migrated_${uid}`;
  try {
    if (localStorage.getItem(migrationFlag) === 'true') {
      return 0;
    }
  } catch {
    return 0;
  }

  const pdvsPath = `users/${uid}/pdvs`;
  const prodsPath = `users/${uid}/produtos`;
  const acertosPath = `users/${uid}/acertos`;

  try {
    const [pdvCheck, prodCheck, acertoCheck] = await Promise.all([
      getDocs(query(collection(db, 'users', uid, 'pdvs'), where('ownerId', '==', uid), limit(1))),
      getDocs(query(collection(db, 'users', uid, 'produtos'), where('ownerId', '==', uid), limit(1))),
      getDocs(query(collection(db, 'users', uid, 'acertos'), where('ownerId', '==', uid), limit(1))),
    ]);

    if (!pdvCheck.empty || !prodCheck.empty || !acertoCheck.empty) {
      localStorage.setItem(migrationFlag, 'true');
      return 0;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `${pdvsPath} | ${prodsPath} | ${acertosPath}`);
  }

  let localPdvs: PontoDeVenda[] = [];
  let localProds: Produto3D[] = [];
  let localAcertos: FechamentoAcerto[] = [];
  let localInventarios: RegistroInventario[] = [];

  try {
    const rawPdvs = localStorage.getItem('lm3d_consignados_pdvs_v2');
    const rawProds = localStorage.getItem('lm3d_consignados_produtos_v2');
    const rawAcertos = localStorage.getItem('lm3d_consignados_acertos_v2');
    const rawInv = localStorage.getItem('lm3d_consignados_inventarios_v2');
    const rawDeleted = localStorage.getItem('lm3d_consignados_deleted_pdvs_v2');
    const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];

    if (rawPdvs) {
      const parsed = JSON.parse(rawPdvs);
      if (Array.isArray(parsed)) {
        localPdvs = parsed.filter((p) => p && p.id && !deletedIds.includes(p.id));
      }
    }
    if (rawProds) {
      const parsed = JSON.parse(rawProds);
      if (Array.isArray(parsed)) localProds = parsed.filter((p) => p && p.id);
    }
    if (rawAcertos) {
      const parsed = JSON.parse(rawAcertos);
      if (Array.isArray(parsed)) localAcertos = parsed.filter((a) => a && a.id);
    }
    if (rawInv) {
      const parsed = JSON.parse(rawInv);
      if (Array.isArray(parsed)) localInventarios = parsed.filter((i) => i && i.id);
    }
  } catch {
    // ignore malformed localStorage
  }

  const totalItems =
    localPdvs.length + localProds.length + localAcertos.length + localInventarios.length;
  if (totalItems === 0) {
    try {
      localStorage.setItem(migrationFlag, 'true');
    } catch {
      // ignore
    }
    return 0;
  }

  type Op = { path: string; ref: ReturnType<typeof doc>; data: Record<string, unknown> };
  const ops: Op[] = [];

  localPdvs.forEach((pdv) => {
    const id = sanitizeId(pdv.id, 'pdv');
    ops.push({
      path: `${pdvsPath}/${id}`,
      ref: doc(db, 'users', uid, 'pdvs', id),
      data: buildPDVPayload({ ...pdv, id }, uid, true),
    });
  });

  localProds.forEach((prod) => {
    const id = sanitizeId(prod.id, 'prod');
    ops.push({
      path: `${prodsPath}/${id}`,
      ref: doc(db, 'users', uid, 'produtos', id),
      data: buildProdutoPayload({ ...prod, id }, uid, true),
    });
  });

  localAcertos.forEach((acerto) => {
    const id = sanitizeId(acerto.id, 'acerto');
    ops.push({
      path: `${acertosPath}/${id}`,
      ref: doc(db, 'users', uid, 'acertos', id),
      data: buildAcertoPayload({ ...acerto, id }, uid),
    });
  });

  localInventarios.forEach((inv) => {
    const id = sanitizeId(inv.id, 'inv');
    ops.push({
      path: `users/${uid}/inventarios/${id}`,
      ref: doc(db, 'users', uid, 'inventarios', id),
      data: buildInventarioPayload({ ...inv, id }, uid),
    });
  });

  for (let i = 0; i < ops.length; i += 400) {
    const chunk = ops.slice(i, i + 400);
    const batch = writeBatch(db);
    chunk.forEach((op) => batch.set(op.ref, op.data));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, chunk[0]?.path ?? `users/${uid}`);
    }
  }

  try {
    localStorage.setItem(migrationFlag, 'true');
  } catch {
    // ignore
  }

  return totalItems;
}
