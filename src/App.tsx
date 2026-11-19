import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  PontoDeVenda,
  Produto3D,
  FechamentoAcerto,
  SessaoAuth,
  MotivoAjusteEstoque,
  ItemEstoquePDV,
  RegistroInventario,
} from './types';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  buildAcertoPayload,
  buildInventarioPayload,
  buildPDVPayload,
  buildProdutoPayload,
  ensureUserProfile,
  migrateLocalDataIfCloudEmpty,
  sanitizeId,
} from './services/firestoreSync';
import {
  mapFirebaseUserToSession,
  logoutUser,
  resendVerificationEmail,
} from './services/authService';
import { Navbar } from './components/Navbar';
import { PDVsTab } from './components/PDVsTab';
import { ProductsTab } from './components/ProductsTab';
import { SettlementsTab } from './components/SettlementsTab';
import { Calculator3DTab } from './components/Calculator3DTab';
import { DashboardTab } from './components/DashboardTab';
import { NewSettlementModal } from './components/NewSettlementModal';
import { NewPDVModal } from './components/NewPDVModal';
import { EditPDVModal } from './components/EditPDVModal';
import { NewProductModal } from './components/NewProductModal';
import { RestockPDVModal } from './components/RestockPDVModal';
import { QuickAdjustStockModal } from './components/QuickAdjustStockModal';
import { InventoryModal } from './components/InventoryModal';
import { LoginScreen } from './components/LoginScreen';
import { MobileBottomNav } from './components/MobileBottomNav';
import {
  CheckCircle2,
  MessageCircle,
  Loader2,
  Cloud,
  MailCheck,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import {
  generateWhatsAppReceipt,
  generateWhatsAppRestockReceipt,
  generateWhatsAppReturnReceipt,
} from './utils/formatters';

function normalizeLegacyExpositor(p: PontoDeVenda): PontoDeVenda {
  const rawTipo = p.tipoExpositor as string;
  if (rawTipo === 'giratorio_balcao_48') {
    return {
      ...p,
      tipoExpositor: 'giratorio_72',
      capacidadeExpositor: p.capacidadeExpositor === 48 ? 72 : p.capacidadeExpositor,
    };
  }
  if (rawTipo === 'display_acrilico_24') {
    return {
      ...p,
      tipoExpositor: 'balcao_70',
      capacidadeExpositor: p.capacidadeExpositor === 24 ? 70 : p.capacidadeExpositor,
    };
  }
  if (rawTipo === 'cartela_parede_36') {
    return {
      ...p,
      tipoExpositor: 'display_clips',
      capacidadeExpositor: p.capacidadeExpositor === 36 ? 30 : p.capacidadeExpositor,
    };
  }
  if (rawTipo === 'display_mini_12') {
    return {
      ...p,
      tipoExpositor: 'sem_display_pecas',
      capacidadeExpositor: p.capacidadeExpositor === 12 ? 50 : p.capacidadeExpositor,
    };
  }
  return p;
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessaoAuth | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'pdvs' | 'catalogo' | 'acertos' | 'calculadora' | 'dashboard'
  >('pdvs');

  // Cloud-synced states
  const [pdvs, setPdvs] = useState<PontoDeVenda[]>([]);
  const [produtos, setProdutos] = useState<Produto3D[]>([]);
  const [acertos, setAcertos] = useState<FechamentoAcerto[]>([]);

  // Modals state
  const [isAcertoModalOpen, setIsAcertoModalOpen] = useState(false);
  const [selectedPdvIdForAcerto, setSelectedPdvIdForAcerto] = useState<string | undefined>(
    undefined
  );
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedPdvIdForRestock, setSelectedPdvIdForRestock] = useState<string | undefined>(
    undefined
  );
  const [selectedRestockMode, setSelectedRestockMode] = useState<'abastecer' | 'recolher'>(
    'abastecer'
  );
  const [isNewPdvModalOpen, setIsNewPdvModalOpen] = useState(false);
  const [editingPdv, setEditingPdv] = useState<PontoDeVenda | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto3D | null>(null);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Produto3D | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    whatsappAction?: () => void;
  } | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const showToast = useCallback((text: string, whatsappAction?: () => void) => {
    setToastMessage({ text, whatsappAction });
    setTimeout(() => setToastMessage(null), 5000);
  }, []);

  const captureFirestoreError = useCallback(
    (error: unknown, operationType: OperationType, path: string | null) => {
      try {
        handleFirestoreError(error, operationType, path);
      } catch (wrapped) {
        setFatalError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
    []
  );

  const initializeCloudForVerifiedUser = useCallback(
    async (user: User) => {
      setFirebaseUser(user);
      setSession(mapFirebaseUserToSession(user));
      setAuthReady(true);

      try {
        const resolvedRole = await ensureUserProfile(user);
        setSession((prev) =>
          prev
            ? { ...prev, usuario: { ...prev.usuario, role: resolvedRole } }
            : mapFirebaseUserToSession(user, resolvedRole)
        );
        const migratedCount = await migrateLocalDataIfCloudEmpty(user.uid);
        setCloudReady(true);
        if (migratedCount > 0) {
          showToast(
            `${migratedCount} registro(s) locais sincronizados com a nuvem!`
          );
        }
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [showToast]
  );

  // 1. Firebase Authentication listener + user profile bootstrap + one-time migration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        setSession(null);
        setPdvs([]);
        setProdutos([]);
        setAcertos([]);
        setCloudReady(false);
        setVerifyFeedback(null);
        setAuthReady(true);
        return;
      }

      if (!user.emailVerified) {
        setFirebaseUser(user);
        setSession(null);
        setCloudReady(false);
        setAuthReady(true);
        return;
      }

      await initializeCloudForVerifiedUser(user);
    });

    return () => unsubscribe();
  }, [initializeCloudForVerifiedUser]);

  // 2. Real-time Firestore onSnapshot listeners (only active when auth & user profile are ready)
  useEffect(() => {
    if (!firebaseUser || !cloudReady) return;

    const uid = firebaseUser.uid;
    const pdvsPath = `users/${uid}/pdvs`;
    const prodsPath = `users/${uid}/produtos`;
    const acertosPath = `users/${uid}/acertos`;

    const pdvsQuery = query(collection(db, 'users', uid, 'pdvs'), where('ownerId', '==', uid));
    const prodsQuery = query(
      collection(db, 'users', uid, 'produtos'),
      where('ownerId', '==', uid)
    );
    const acertosQuery = query(
      collection(db, 'users', uid, 'acertos'),
      where('ownerId', '==', uid)
    );

    const unsubPdvs = onSnapshot(
      pdvsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => normalizeLegacyExpositor(d.data() as PontoDeVenda))
          .sort((a, b) => (b.dataUltimaVisita || '').localeCompare(a.dataUltimaVisita || ''));
        setPdvs(list);
      },
      (error) => {
        captureFirestoreError(error, OperationType.LIST, pdvsPath);
      }
    );

    const unsubProds = onSnapshot(
      prodsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => d.data() as Produto3D)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setProdutos(list);
      },
      (error) => {
        captureFirestoreError(error, OperationType.LIST, prodsPath);
      }
    );

    const unsubAcertos = onSnapshot(
      acertosQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => d.data() as FechamentoAcerto)
          .sort((a, b) => (b.dataAcerto || '').localeCompare(a.dataAcerto || ''));
        setAcertos(list);
      },
      (error) => {
        captureFirestoreError(error, OperationType.LIST, acertosPath);
      }
    );

    return () => {
      unsubPdvs();
      unsubProds();
      unsubAcertos();
    };
  }, [firebaseUser, cloudReady, captureFirestoreError]);

  // Open Acerto Modal
  const handleOpenNovoAcerto = (pdvId?: string) => {
    setSelectedPdvIdForAcerto(pdvId);
    setIsAcertoModalOpen(true);
  };

  // Open Restock or Return Modal
  const handleOpenRestock = (
    pdvId?: string,
    mode: 'abastecer' | 'recolher' = 'abastecer'
  ) => {
    setSelectedPdvIdForRestock(pdvId);
    setSelectedRestockMode(mode);
    setIsRestockModalOpen(true);
  };

  // Confirm Restock or Return of PDV pieces (Atomic Batch in Firestore)
  const handleConfirmRestock = async (
    pdvId: string,
    itens: { produtoId: string; quantidade: number }[],
    observacao?: string,
    tipoOperacao: 'abastecer' | 'recolher' = 'abastecer'
  ) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const targetPdv = pdvs.find((p) => p.id === pdvId);
    if (!targetPdv) return;

    const totalPecas = itens.reduce((acc, i) => acc + i.quantidade, 0);
    const valorMovimento = itens.reduce((acc, i) => {
      const prod = produtos.find((p) => p.id === i.produtoId);
      return acc + i.quantidade * (prod?.precoVenda || 13.0);
    }, 0);

    const batch = writeBatch(db);

    if (tipoOperacao === 'recolher') {
      const novoTotal = Math.max(0, targetPdv.totalPecasNoDisplay - totalPecas);
      const novoValor =
        novoTotal === 0
          ? 0
          : Math.max(0, (targetPdv.valorTotalConsignado || 0) - valorMovimento);

      const mapa = new Map<string, number>();
      (targetPdv.itensNoDisplay || []).forEach((it) => {
        mapa.set(it.produtoId, (mapa.get(it.produtoId) || 0) + it.quantidade);
      });
      itens.forEach((it) => {
        if (mapa.has(it.produtoId)) {
          const rest = Math.max(0, (mapa.get(it.produtoId) || 0) - it.quantidade);
          if (rest > 0) mapa.set(it.produtoId, rest);
          else mapa.delete(it.produtoId);
        }
      });
      const novosItens: ItemEstoquePDV[] = Array.from(mapa.entries()).map(
        ([produtoId, quantidade]) => ({ produtoId, quantidade })
      );

      const updatedPdv: PontoDeVenda = {
        ...targetPdv,
        itensNoDisplay: novosItens,
        totalPecasNoDisplay: novoTotal,
        valorTotalConsignado: novoValor,
        dataUltimaVisita: new Date().toISOString(),
      };

      batch.update(
        doc(db, 'users', uid, 'pdvs', pdvId),
        buildPDVPayload(updatedPdv, uid, false)
      );

      produtos.forEach((prod) => {
        const itemRetirado = itens.find((i) => i.produtoId === prod.id);
        if (!itemRetirado) return;
        const updatedProd: Produto3D = {
          ...prod,
          estoqueAtelie: prod.estoqueAtelie + itemRetirado.quantidade,
          totalConsignado: Math.max(0, (prod.totalConsignado || 0) - itemRetirado.quantidade),
        };
        batch.update(
          doc(db, 'users', uid, 'produtos', prod.id),
          buildProdutoPayload(updatedProd, uid, false)
        );
      });

      try {
        await batch.commit();
      } catch (error) {
        captureFirestoreError(error, OperationType.WRITE, `users/${uid}/pdvs/${pdvId}`);
        return;
      }

      const cleanPhone = targetPdv.telefone.replace(/\D/g, '');
      const sendWhatsApp = () => {
        const itensFormatados = itens.map((i) => {
          const prod = produtos.find((p) => p.id === i.produtoId);
          return {
            produtoNome: prod?.nome || 'Chaveiro 3D',
            quantidade: i.quantidade,
            precoUnitario: prod?.precoVenda || 13.0,
          };
        });
        const msg = generateWhatsAppReturnReceipt(
          targetPdv,
          itensFormatados,
          novoTotal,
          observacao
        );
        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
      };

      showToast(
        `Recolhimento concluído: +${totalPecas} peças retornaram ao estoque do Ateliê!`,
        sendWhatsApp
      );
      return;
    }

    // MODO ABASTECIMENTO: ATELIÊ -> PDV
    const novoTotal = targetPdv.totalPecasNoDisplay + totalPecas;
    const novoValor = (targetPdv.valorTotalConsignado || 0) + valorMovimento;

    const mapa = new Map<string, number>();
    (targetPdv.itensNoDisplay || []).forEach((it) => {
      if (it.quantidade > 0) {
        mapa.set(it.produtoId, (mapa.get(it.produtoId) || 0) + it.quantidade);
      }
    });
    itens.forEach((it) => {
      if (it.quantidade > 0) {
        mapa.set(it.produtoId, (mapa.get(it.produtoId) || 0) + it.quantidade);
      }
    });
    const novosItens: ItemEstoquePDV[] = Array.from(mapa.entries()).map(
      ([produtoId, quantidade]) => ({ produtoId, quantidade })
    );

    const updatedPdv: PontoDeVenda = {
      ...targetPdv,
      itensNoDisplay: novosItens,
      totalPecasNoDisplay: novoTotal,
      valorTotalConsignado: novoValor,
      dataUltimaVisita: new Date().toISOString(),
    };

    batch.update(
      doc(db, 'users', uid, 'pdvs', pdvId),
      buildPDVPayload(updatedPdv, uid, false)
    );

    produtos.forEach((prod) => {
      const itemRestock = itens.find((i) => i.produtoId === prod.id);
      if (!itemRestock) return;
      const updatedProd: Produto3D = {
        ...prod,
        estoqueAtelie: Math.max(0, prod.estoqueAtelie - itemRestock.quantidade),
        totalConsignado: (prod.totalConsignado || 0) + itemRestock.quantidade,
      };
      batch.update(
        doc(db, 'users', uid, 'produtos', prod.id),
        buildProdutoPayload(updatedProd, uid, false)
      );
    });

    try {
      await batch.commit();
    } catch (error) {
      captureFirestoreError(error, OperationType.WRITE, `users/${uid}/pdvs/${pdvId}`);
      return;
    }

    const cleanPhone = targetPdv.telefone.replace(/\D/g, '');
    const sendWhatsApp = () => {
      const itensFormatados = itens.map((i) => {
        const prod = produtos.find((p) => p.id === i.produtoId);
        return {
          produtoNome: prod?.nome || 'Chaveiro 3D',
          quantidade: i.quantidade,
          precoUnitario: prod?.precoVenda || 13.0,
        };
      });
      const msg = generateWhatsAppRestockReceipt(targetPdv, itensFormatados, novoTotal);
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
    };

    showToast(
      `Expositor da loja "${targetPdv.nomeLoja}" abastecido (+${totalPecas} peças)!`,
      sendWhatsApp
    );
  };

  // Save new Acerto (Atomic Batch in Firestore)
  const handleSaveAcerto = async (novoAcerto: FechamentoAcerto) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const acertoId = sanitizeId(novoAcerto.id, 'acerto');
    const safeAcerto: FechamentoAcerto = { ...novoAcerto, id: acertoId };

    const batch = writeBatch(db);
    batch.set(
      doc(db, 'users', uid, 'acertos', acertoId),
      buildAcertoPayload(safeAcerto, uid)
    );

    const targetPdv = pdvs.find((p) => p.id === novoAcerto.pdvId);
    if (targetPdv) {
      const mapa = new Map<string, number>();
      (targetPdv.itensNoDisplay || []).forEach((it) => {
        if (it.quantidade > 0) mapa.set(it.produtoId, it.quantidade);
      });
      novoAcerto.itens.forEach((item) => {
        const saldoItem = Math.max(0, item.qtdRestante + item.qtdReposta);
        if (saldoItem > 0) {
          mapa.set(item.produtoId, saldoItem);
        } else {
          mapa.delete(item.produtoId);
        }
      });

      const novosItens: ItemEstoquePDV[] = Array.from(mapa.entries()).map(
        ([produtoId, quantidade]) => ({ produtoId, quantidade })
      );

      const newPecasCount =
        (targetPdv.itensNoDisplay && targetPdv.itensNoDisplay.length > 0) ||
        novosItens.length > 0
          ? novosItens.reduce((acc, it) => acc + it.quantidade, 0)
          : Math.max(
              0,
              targetPdv.totalPecasNoDisplay -
                novoAcerto.totalPecasVendidas +
                novoAcerto.totalPecasRepostas
            );

      const valorCalculadoItens = novosItens.reduce((acc, it) => {
        const prod = produtos.find((pr) => pr.id === it.produtoId);
        return acc + it.quantidade * (prod?.precoVenda || 13.0);
      }, 0);

      const diasProxima =
        targetPdv.frequenciaAcerto === 'semanal'
          ? 7
          : targetPdv.frequenciaAcerto === 'quinzenal'
          ? 14
          : 30;
      const proximaData = new Date(Date.now() + diasProxima * 86400000).toISOString();

      const updatedPdv: PontoDeVenda = {
        ...targetPdv,
        itensNoDisplay: novosItens,
        totalPecasNoDisplay: newPecasCount,
        valorTotalConsignado:
          novosItens.length > 0 ? valorCalculadoItens : newPecasCount * 13.0,
        totalVendidoAcumulado:
          targetPdv.totalVendidoAcumulado + novoAcerto.valorBrutoVendido,
        dataUltimaVisita: novoAcerto.dataAcerto,
        dataProximaVisita: proximaData,
        status: 'ativo',
      };

      batch.update(
        doc(db, 'users', uid, 'pdvs', targetPdv.id),
        buildPDVPayload(updatedPdv, uid, false)
      );
    }

    produtos.forEach((prod) => {
      const itemFechado = novoAcerto.itens.find((i) => i.produtoId === prod.id);
      if (!itemFechado) return;
      const updatedProd: Produto3D = {
        ...prod,
        estoqueAtelie: Math.max(0, prod.estoqueAtelie - itemFechado.qtdReposta),
        totalConsignado: Math.max(
          0,
          prod.totalConsignado - itemFechado.qtdVendida + itemFechado.qtdReposta
        ),
      };
      batch.update(
        doc(db, 'users', uid, 'produtos', prod.id),
        buildProdutoPayload(updatedProd, uid, false)
      );
    });

    try {
      await batch.commit();
    } catch (error) {
      captureFirestoreError(error, OperationType.WRITE, `users/${uid}/acertos/${acertoId}`);
      return;
    }

    setActiveTab('acertos');

    const cleanPhone = novoAcerto.pdvTelefone.replace(/\D/g, '');
    const sendWhatsApp = () => {
      const msg = generateWhatsAppReceipt(novoAcerto);
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
    };

    showToast(`Acerto ${novoAcerto.codigoAcerto} concluído com sucesso!`, sendWhatsApp);
  };

  // Delete Acerto (Atomic Batch in Firestore with optional stock/revenue rollback)
  const handleDeleteAcerto = async (acertoId: string, estornarEstoque = true) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const targetAcerto = acertos.find((a) => a.id === acertoId);
    if (!targetAcerto) return;

    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'acertos', acertoId));

    if (estornarEstoque) {
      const targetPdv = pdvs.find((p) => p.id === targetAcerto.pdvId);
      if (targetPdv) {
        const mapa = new Map<string, number>();
        (targetPdv.itensNoDisplay || []).forEach((it) => {
          if (it.quantidade > 0) mapa.set(it.produtoId, it.quantidade);
        });

        targetAcerto.itens.forEach((item) => {
          const atual = mapa.get(item.produtoId) || 0;
          const delta = (item.qtdVendida || 0) - (item.qtdReposta || 0);
          const revertido = Math.max(0, atual + delta);
          if (revertido > 0) {
            mapa.set(item.produtoId, revertido);
          } else {
            mapa.delete(item.produtoId);
          }
        });

        const novosItens: ItemEstoquePDV[] = Array.from(mapa.entries()).map(
          ([produtoId, quantidade]) => ({ produtoId, quantidade })
        );

        const newPecasCount =
          (targetPdv.itensNoDisplay && targetPdv.itensNoDisplay.length > 0) ||
          novosItens.length > 0
            ? novosItens.reduce((acc, it) => acc + it.quantidade, 0)
            : Math.max(
                0,
                targetPdv.totalPecasNoDisplay +
                  targetAcerto.totalPecasVendidas -
                  targetAcerto.totalPecasRepostas
              );

        const valorCalculadoItens = novosItens.reduce((acc, it) => {
          const prod = produtos.find((pr) => pr.id === it.produtoId);
          return acc + it.quantidade * (prod?.precoVenda || 13.0);
        }, 0);

        const updatedPdv: PontoDeVenda = {
          ...targetPdv,
          itensNoDisplay: novosItens,
          totalPecasNoDisplay: newPecasCount,
          valorTotalConsignado:
            novosItens.length > 0 ? valorCalculadoItens : newPecasCount * 13.0,
          totalVendidoAcumulado: Math.max(
            0,
            targetPdv.totalVendidoAcumulado - targetAcerto.valorBrutoVendido
          ),
        };

        batch.update(
          doc(db, 'users', uid, 'pdvs', targetPdv.id),
          buildPDVPayload(updatedPdv, uid, false)
        );
      }

      const vendidasPorProd = new Map<string, number>();
      const repostasPorProd = new Map<string, number>();
      targetAcerto.itens.forEach((item) => {
        vendidasPorProd.set(
          item.produtoId,
          (vendidasPorProd.get(item.produtoId) || 0) + (item.qtdVendida || 0)
        );
        repostasPorProd.set(
          item.produtoId,
          (repostasPorProd.get(item.produtoId) || 0) + (item.qtdReposta || 0)
        );
      });

      produtos.forEach((prod) => {
        if (!vendidasPorProd.has(prod.id) && !repostasPorProd.has(prod.id)) return;
        const qtdVendida = vendidasPorProd.get(prod.id) || 0;
        const qtdReposta = repostasPorProd.get(prod.id) || 0;
        const updatedProd: Produto3D = {
          ...prod,
          estoqueAtelie: Math.max(0, prod.estoqueAtelie + qtdReposta),
          totalConsignado: Math.max(
            0,
            (prod.totalConsignado || 0) + qtdVendida - qtdReposta
          ),
        };
        batch.update(
          doc(db, 'users', uid, 'produtos', prod.id),
          buildProdutoPayload(updatedProd, uid, false)
        );
      });
    }

    try {
      await batch.commit();
      showToast(
        estornarEstoque
          ? `Acerto ${targetAcerto.codigoAcerto} excluído e saldos estornados!`
          : `Acerto ${targetAcerto.codigoAcerto} excluído com sucesso!`
      );
    } catch (error) {
      captureFirestoreError(error, OperationType.DELETE, `users/${uid}/acertos/${acertoId}`);
    }
  };

  // Save new PDV (Atomic Batch in Firestore)
  const handleSavePDV = async (
    novoPDV: PontoDeVenda,
    itensIniciais?: { produtoId: string; quantidade: number }[]
  ) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const pdvId = sanitizeId(novoPDV.id, 'pdv');
    const safePDV: PontoDeVenda = { ...novoPDV, id: pdvId };

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'pdvs', pdvId), buildPDVPayload(safePDV, uid, true));

    if (itensIniciais && itensIniciais.length > 0) {
      produtos.forEach((prod) => {
        const item = itensIniciais.find((i) => i.produtoId === prod.id);
        if (!item || item.quantidade <= 0) return;
        const updatedProd: Produto3D = {
          ...prod,
          estoqueAtelie: Math.max(0, prod.estoqueAtelie - item.quantidade),
          totalConsignado: (prod.totalConsignado || 0) + item.quantidade,
        };
        batch.update(
          doc(db, 'users', uid, 'produtos', prod.id),
          buildProdutoPayload(updatedProd, uid, false)
        );
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      captureFirestoreError(error, OperationType.CREATE, `users/${uid}/pdvs/${pdvId}`);
      return;
    }

    if (itensIniciais && itensIniciais.length > 0) {
      const cleanPhone = safePDV.telefone.replace(/\D/g, '');
      const sendWhatsApp = () => {
        const itensFormatados = itensIniciais.map((i) => {
          const prod = produtos.find((p) => p.id === i.produtoId);
          return {
            produtoNome: prod?.nome || 'Chaveiro 3D',
            quantidade: i.quantidade,
            precoUnitario: prod?.precoVenda || 13.0,
          };
        });
        const msg = generateWhatsAppRestockReceipt(
          safePDV,
          itensFormatados,
          safePDV.totalPecasNoDisplay
        );
        window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
      };

      showToast(
        `PDV "${safePDV.nomeLoja}" cadastrado com ${safePDV.totalPecasNoDisplay} peças do estoque!`,
        sendWhatsApp
      );
    } else if (safePDV.totalPecasNoDisplay === 0) {
      showToast(
        `PDV "${safePDV.nomeLoja}" cadastrado! Use "Abastecer PDV" quando for levar as peças.`
      );
    } else {
      showToast(`Ponto de Venda "${safePDV.nomeLoja}" cadastrado!`);
    }

    setActiveTab('pdvs');
  };

  // Update existing PDV
  const handleUpdatePDV = async (updated: PontoDeVenda) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const path = `users/${uid}/pdvs/${updated.id}`;
    try {
      await updateDoc(doc(db, 'users', uid, 'pdvs', updated.id), buildPDVPayload(updated, uid, false));
      showToast(`Ponto de Venda "${updated.nomeLoja}" atualizado!`);
    } catch (error) {
      captureFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Delete PDV
  const handleDeletePDV = async (pdvId: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const target = pdvs.find((p) => p.id === pdvId);
    const batch = writeBatch(db);

    batch.delete(doc(db, 'users', uid, 'pdvs', pdvId));

    if (target?.itensNoDisplay && target.itensNoDisplay.length > 0) {
      produtos.forEach((prod) => {
        const item = target.itensNoDisplay?.find((i) => i.produtoId === prod.id);
        if (!item) return;
        const updatedProd: Produto3D = {
          ...prod,
          totalConsignado: Math.max(0, (prod.totalConsignado || 0) - item.quantidade),
        };
        batch.update(
          doc(db, 'users', uid, 'produtos', prod.id),
          buildProdutoPayload(updatedProd, uid, false)
        );
      });
    }

    try {
      await batch.commit();
      if (editingPdv?.id === pdvId) {
        setEditingPdv(null);
      }
      showToast(`Ponto de Venda "${target?.nomeLoja || 'PDV'}" excluído com sucesso!`);
    } catch (error) {
      captureFirestoreError(error, OperationType.DELETE, `users/${uid}/pdvs/${pdvId}`);
    }
  };

  // Save or update Product
  const handleSaveProduct = async (produto: Produto3D, isEdit = false) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const prodId = sanitizeId(produto.id, 'prod');
    const safeProd: Produto3D = { ...produto, id: prodId };
    const path = `users/${uid}/produtos/${prodId}`;

    try {
      if (isEdit) {
        await updateDoc(
          doc(db, 'users', uid, 'produtos', prodId),
          buildProdutoPayload(safeProd, uid, false)
        );
        showToast(`Produto "${safeProd.nome}" atualizado com sucesso!`);
      } else {
        await setDoc(
          doc(db, 'users', uid, 'produtos', prodId),
          buildProdutoPayload(safeProd, uid, true)
        );
        showToast(`Modelo 3D "${safeProd.nome}" adicionado ao catálogo!`);
        setActiveTab('catalogo');
      }
    } catch (error) {
      captureFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  // Delete Product from Catalog
  const handleDeleteProduct = async (produtoId: string) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const target = produtos.find((p) => p.id === produtoId);
    const path = `users/${uid}/produtos/${produtoId}`;

    try {
      await deleteDoc(doc(db, 'users', uid, 'produtos', produtoId));
      if (adjustingProduct?.id === produtoId) {
        setAdjustingProduct(null);
      }
      if (editingProduct?.id === produtoId) {
        setEditingProduct(null);
        setIsNewProductModalOpen(false);
      }
      showToast(`Produto "${target?.nome || 'Produto'}" excluído do catálogo!`);
    } catch (error) {
      captureFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Ajustar estoque avulso de um produto
  const handleAdjustSingleProductStock = async (
    produtoId: string,
    novoEstoque: number,
    _motivo: MotivoAjusteEstoque,
    _observacao?: string
  ) => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const target = produtos.find((p) => p.id === produtoId);
    if (!target) return;

    const delta = novoEstoque - target.estoqueAtelie;
    const sinal = delta > 0 ? `+${delta}` : `${delta}`;
    const updatedProd: Produto3D = { ...target, estoqueAtelie: Math.max(0, novoEstoque) };

    try {
      await updateDoc(
        doc(db, 'users', uid, 'produtos', produtoId),
        buildProdutoPayload(updatedProd, uid, false)
      );
      showToast(`Estoque de "${target.nome}" atualizado: ${novoEstoque} un. (${sinal})`);
    } catch (error) {
      captureFirestoreError(
        error,
        OperationType.UPDATE,
        `users/${uid}/produtos/${produtoId}`
      );
    }
  };

  // Aplicar Balanço & Inventário completo
  const handleApplyInventory = async (
    ajustes: { produtoId: string; novoEstoque: number; diferenca: number }[],
    motivo: string,
    observacao?: string
  ) => {
    if (!firebaseUser) return;
    if (ajustes.length === 0) {
      showToast('Nenhuma divergência foi alterada no inventário.');
      return;
    }

    const uid = firebaseUser.uid;
    const mapaAjustes = new Map(ajustes.map((a) => [a.produtoId, a.novoEstoque]));
    const batch = writeBatch(db);

    produtos.forEach((p) => {
      if (mapaAjustes.has(p.id)) {
        const updatedProd: Produto3D = {
          ...p,
          estoqueAtelie: Math.max(0, mapaAjustes.get(p.id)!),
        };
        batch.update(
          doc(db, 'users', uid, 'produtos', p.id),
          buildProdutoPayload(updatedProd, uid, false)
        );
      }
    });

    const invId = sanitizeId(`inv-${Date.now()}`, 'inv');
    const registro: RegistroInventario = {
      id: invId,
      data: new Date().toISOString(),
      motivo,
      itensAlterados: ajustes.length,
      saldoDiferenca: ajustes.reduce((acc, a) => acc + a.diferenca, 0),
      observacoes: observacao,
    };
    batch.set(
      doc(db, 'users', uid, 'inventarios', invId),
      buildInventarioPayload(registro, uid)
    );

    try {
      await batch.commit();
    } catch (error) {
      captureFirestoreError(error, OperationType.WRITE, `users/${uid}/inventarios/${invId}`);
      return;
    }

    const totalDiferencaPecas = ajustes.reduce((acc, a) => acc + a.diferenca, 0);
    const sinal =
      totalDiferencaPecas > 0 ? `+${totalDiferencaPecas}` : `${totalDiferencaPecas}`;

    showToast(
      `Inventário aplicado! ${ajustes.length} produto(s) corrigido(s) no estoque (${sinal} peças no saldo).`
    );
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Você encerrou a sessão.');
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
    }
  };

  // Carregamento inicial de autenticação
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-['Plus_Jakarta_Sans',sans-serif]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-300">
          Verificando conta e conexão com a nuvem...
        </p>
      </div>
    );
  }

  const handleCheckEmailVerified = async () => {
    if (!firebaseUser) return;
    setVerifyingEmail(true);
    setVerifyFeedback(null);
    try {
      await firebaseUser.reload();
      const refreshedUser = auth.currentUser;
      if (refreshedUser?.emailVerified) {
        await refreshedUser.getIdToken(true);
        await initializeCloudForVerifiedUser(refreshedUser);
      } else {
        setVerifyFeedback({
          type: 'error',
          text: 'O e-mail ainda não foi confirmado. Clique no link enviado para sua caixa de entrada ou spam e tente novamente.',
        });
      }
    } catch {
      setVerifyFeedback({
        type: 'error',
        text: 'Não foi possível verificar o status agora. Tente novamente em instantes.',
      });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setVerifyFeedback(null);
    const res = await resendVerificationEmail();
    setResendingEmail(false);
    if (res.success) {
      setVerifyFeedback({
        type: 'success',
        text: `Link de confirmação reenviado para ${firebaseUser?.email || 'seu e-mail'}. Verifique caixa de entrada e spam.`,
      });
    } else {
      setVerifyFeedback({
        type: 'error',
        text: res.error || 'Não foi possível reenviar o e-mail de confirmação.',
      });
    }
  };

  // Se o usuário entrou com E-mail/Senha mas ainda não verificou o e-mail
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <MailCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Confirme seu e-mail</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para liberar a sincronização segura na nuvem, confirme o endereço{' '}
              <strong className="text-emerald-400">{firebaseUser.email}</strong> clicando no link enviado para a sua caixa de entrada.
            </p>
          </div>

          {verifyFeedback && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 text-left border ${
                verifyFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {verifyFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{verifyFeedback.text}</span>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleCheckEmailVerified}
              disabled={verifyingEmail || resendingEmail}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {verifyingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{verifyingEmail ? 'Verificando...' : 'Já confirmei meu e-mail (Entrar)'}</span>
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={verifyingEmail || resendingEmail}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {resendingEmail ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MailCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{resendingEmail ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={verifyingEmail || resendingEmail}
              className="w-full py-2.5 px-4 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-900/50 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair / Trocar conta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, exibe a tela de login
  if (!session || !firebaseUser) {
    return (
      <LoginScreen
        onLoginSuccess={() => {
          showToast('Conectado! Sincronizando dados em tempo real...');
        }}
      />
    );
  }

  const totalPecasRua = pdvs.reduce((acc, p) => acc + p.totalPecasNoDisplay, 0);
  const alertasVisita = pdvs.filter((p) => p.status === 'visita_pendente').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{toastMessage.text}</span>
          {toastMessage.whatsappAction && (
            <button
              type="button"
              onClick={toastMessage.whatsappAction}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black rounded-lg flex items-center gap-1 transition-all shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          )}
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNovoAcerto={() => handleOpenNovoAcerto()}
        onOpenNovoPDV={() => setIsNewPdvModalOpen(true)}
        onOpenNovoProduto={() => {
          setEditingProduct(null);
          setIsNewProductModalOpen(true);
        }}
        totalPecasRua={totalPecasRua}
        totalLojas={pdvs.length}
        alertasVisita={alertasVisita}
        usuario={session.usuario}
        onLogout={handleLogout}
      />

      {/* Main Content Area with Mobile Safe Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-24 sm:pb-12">
        {!cloudReady ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-xs font-semibold gap-2">
            <Cloud className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Sincronizando dados com a nuvem...</span>
          </div>
        ) : (
          <>
            {activeTab === 'pdvs' && (
              <PDVsTab
                pdvs={pdvs}
                produtos={produtos}
                onOpenNovoAcerto={(pdvId) => handleOpenNovoAcerto(pdvId)}
                onOpenNovoPDV={() => setIsNewPdvModalOpen(true)}
                onOpenAbastecerPDV={(pdvId, mode) => handleOpenRestock(pdvId, mode)}
                onEditarPDV={(pdv) => setEditingPdv(pdv)}
                onExcluirPDV={handleDeletePDV}
              />
            )}

            {activeTab === 'acertos' && (
              <SettlementsTab
                acertos={acertos}
                pdvs={pdvs}
                onOpenNovoAcerto={(pdvId) => handleOpenNovoAcerto(pdvId)}
                onExcluirAcerto={handleDeleteAcerto}
              />
            )}

            {activeTab === 'catalogo' && (
              <ProductsTab
                produtos={produtos}
                onOpenNovoProduto={() => {
                  setEditingProduct(null);
                  setIsNewProductModalOpen(true);
                }}
                onOpenInventario={() => setIsInventoryModalOpen(true)}
                onAjustarEstoqueProduto={(prod) => setAdjustingProduct(prod)}
                onEditarProduto={(prod) => {
                  setEditingProduct(prod);
                  setIsNewProductModalOpen(true);
                }}
                onExcluirProduto={handleDeleteProduct}
              />
            )}

            {activeTab === 'calculadora' && (
              <Calculator3DTab produtos={produtos} pdvs={pdvs} />
            )}

            {activeTab === 'dashboard' && (
              <DashboardTab
                pdvs={pdvs}
                produtos={produtos}
                acertos={acertos}
                onOpenInventario={() => setIsInventoryModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNovoAcerto={() => handleOpenNovoAcerto()}
        alertasVisita={alertasVisita}
      />

      {/* Modals */}
      <NewSettlementModal
        isOpen={isAcertoModalOpen}
        onClose={() => setIsAcertoModalOpen(false)}
        onSave={handleSaveAcerto}
        pdvs={pdvs}
        produtos={produtos}
        initialPdvId={selectedPdvIdForAcerto}
      />

      <RestockPDVModal
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        pdvs={pdvs}
        produtos={produtos}
        initialPdvId={selectedPdvIdForRestock}
        initialMode={selectedRestockMode}
        onConfirmRestock={handleConfirmRestock}
      />

      <NewPDVModal
        isOpen={isNewPdvModalOpen}
        onClose={() => setIsNewPdvModalOpen(false)}
        onSave={handleSavePDV}
        produtos={produtos}
      />

      <EditPDVModal
        isOpen={!!editingPdv}
        onClose={() => setEditingPdv(null)}
        pdv={editingPdv}
        onSave={handleUpdatePDV}
        onDelete={handleDeletePDV}
        produtos={produtos}
      />

      <NewProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => {
          setIsNewProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        produtoParaEditar={editingProduct}
      />

      <QuickAdjustStockModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        produto={adjustingProduct}
        onSave={handleAdjustSingleProductStock}
      />

      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        produtos={produtos}
        onApplyInventory={handleApplyInventory}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">LM3D Consignados</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-xs">
                Chaveiros & Impressão 3D para Lojas Parceiras
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Modelos: Articulados, Geek, Motos, Letras, Suportes</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                Sincronização na Nuvem
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              Sistema de gestão de rotas de visitas, reposição de displays, conferência e
              fechamento financeiro de chaveiros e peças em 3D.
            </p>
            <p className="whitespace-nowrap">
              © {new Date().getFullYear()} LM3D Consignados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
