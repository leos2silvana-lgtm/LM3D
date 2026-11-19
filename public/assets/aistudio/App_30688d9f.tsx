import React, { useState, useEffect } from 'react';
import { 
  PontoDeVenda, 
  Produto3D, 
  FechamentoAcerto,
  SessaoAuth,
  MotivoAjusteEstoque
} from './types';
import { 
  INITIAL_PDVS, 
  INITIAL_PRODUTOS_3D, 
  INITIAL_ACERTOS 
} from './data/mockData';
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
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { getCurrentSession, logoutUser } from './services/authService';
import { 
  CheckCircle2, 
  Store, 
  Package, 
  Receipt,
  MessageCircle,
  HelpCircle,
  Boxes
} from 'lucide-react';
import { 
  generateWhatsAppReceipt, 
  generateWhatsAppRestockReceipt,
  generateWhatsAppReturnReceipt 
} from './utils/formatters';

const STORAGE_PDVS = 'lm3d_consignados_pdvs_v2';
const STORAGE_DELETED_PDVS = 'lm3d_consignados_deleted_pdvs_v2';
const STORAGE_PRODUTOS = 'lm3d_consignados_produtos_v2';
const STORAGE_ACERTOS = 'lm3d_consignados_acertos_v2';
const STORAGE_INVENTARIOS = 'lm3d_consignados_inventarios_v2';

export default function App() {
  // Authentication session (Persists automatically in localStorage)
  const [session, setSession] = useState<SessaoAuth | null>(() => getCurrentSession());
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'pdvs' | 'catalogo' | 'acertos' | 'calculadora' | 'dashboard'>('pdvs');

  // 1. PDVs State (com proteção contra retorno de PDVs excluídos)
  const [pdvs, setPdvs] = useState<PontoDeVenda[]>(() => {
    try {
      const savedDeleted = localStorage.getItem(STORAGE_DELETED_PDVS);
      const deletedIds: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];

      const saved = localStorage.getItem(STORAGE_PDVS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Mantém a lista salva (inclusive se vazia), filtrando IDs que foram deletados
          return parsed
            .filter((p: any) => p && p.id && !deletedIds.includes(p.id))
            .map((p: any) => {
              if (p.tipoExpositor === 'giratorio_balcao_48') {
                return { ...p, tipoExpositor: 'giratorio_72', capacidadeExpositor: p.capacidadeExpositor === 48 ? 72 : p.capacidadeExpositor };
              }
              if (p.tipoExpositor === 'display_acrilico_24') {
                return { ...p, tipoExpositor: 'balcao_70', capacidadeExpositor: p.capacidadeExpositor === 24 ? 70 : p.capacidadeExpositor };
              }
              if (p.tipoExpositor === 'cartela_parede_36') {
                return { ...p, tipoExpositor: 'display_clips', capacidadeExpositor: p.capacidadeExpositor === 36 ? 30 : p.capacidadeExpositor };
              }
              if (p.tipoExpositor === 'display_mini_12') {
                return { ...p, tipoExpositor: 'sem_display_pecas', capacidadeExpositor: p.capacidadeExpositor === 12 ? 50 : p.capacidadeExpositor };
              }
              return p;
            });
        }
      }
      // Primeiro acesso: filtra dados padrão contra lista de excluídos
      return INITIAL_PDVS.filter(p => !deletedIds.includes(p.id));
    } catch {
      // ignore
    }
    return INITIAL_PDVS;
  });

  // 2. Produtos State
  const [produtos, setProdutos] = useState<Produto3D[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PRODUTOS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Garante que fotos dos produtos padrão sejam preenchidas caso não existam no cache anterior
          return parsed.map((p: Produto3D) => {
            if (!p.fotoUrl) {
              const mock = INITIAL_PRODUTOS_3D.find(m => m.id === p.id);
              if (mock?.fotoUrl) {
                return { ...p, fotoUrl: mock.fotoUrl };
              }
            }
            return p;
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUTOS_3D;
  });

  // 3. Acertos State
  const [acertos, setAcertos] = useState<FechamentoAcerto[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACERTOS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_ACERTOS;
  });

  // Modals state
  const [isAcertoModalOpen, setIsAcertoModalOpen] = useState(false);
  const [selectedPdvIdForAcerto, setSelectedPdvIdForAcerto] = useState<string | undefined>(undefined);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedPdvIdForRestock, setSelectedPdvIdForRestock] = useState<string | undefined>(undefined);
  const [selectedRestockMode, setSelectedRestockMode] = useState<'abastecer' | 'recolher'>('abastecer');
  const [isNewPdvModalOpen, setIsNewPdvModalOpen] = useState(false);
  const [editingPdv, setEditingPdv] = useState<PontoDeVenda | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Produto3D | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; whatsappAction?: () => void } | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PDVS, JSON.stringify(pdvs));
    } catch (e) {
      console.error(e);
    }
  }, [pdvs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PRODUTOS, JSON.stringify(produtos));
    } catch (e) {
      console.error(e);
    }
  }, [produtos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACERTOS, JSON.stringify(acertos));
    } catch (e) {
      console.error(e);
    }
  }, [acertos]);

  const showToast = (text: string, whatsappAction?: () => void) => {
    setToastMessage({ text, whatsappAction });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Open Acerto Modal
  const handleOpenNovoAcerto = (pdvId?: string) => {
    setSelectedPdvIdForAcerto(pdvId);
    setIsAcertoModalOpen(true);
  };

  // Open Restock or Return Modal
  const handleOpenRestock = (pdvId?: string, mode: 'abastecer' | 'recolher' = 'abastecer') => {
    setSelectedPdvIdForRestock(pdvId);
    setSelectedRestockMode(mode);
    setIsRestockModalOpen(true);
  };

  // Confirm Restock or Return of PDV pieces
  const handleConfirmRestock = (
    pdvId: string, 
    itens: { produtoId: string; quantidade: number }[],
    observacao?: string,
    tipoOperacao: 'abastecer' | 'recolher' = 'abastecer'
  ) => {
    const targetPdv = pdvs.find(p => p.id === pdvId);
    if (!targetPdv) return;

    const totalPecas = itens.reduce((acc, i) => acc + i.quantidade, 0);

    // MODO RECOLHIMENTO / DEVOLUÇÃO: PEÇAS RETORNAM DO PDV PARA O ESTOQUE DO ATELIÊ
    if (tipoOperacao === 'recolher') {
      const novoTotal = Math.max(0, targetPdv.totalPecasNoDisplay - totalPecas);

      // 1. Atualiza estoque do PDV (desconta peças retiradas da loja)
      setPdvs(prev => prev.map(p => {
        if (p.id !== pdvId) return p;
        return {
          ...p,
          totalPecasNoDisplay: novoTotal,
          valorTotalConsignado: novoTotal * 13.00,
          dataUltimaVisita: new Date().toISOString(),
        };
      }));

      // 2. RETORNA AS PEÇAS PARA O ESTOQUE DO ATELIÊ E REDUZ O CONSIGNADO
      setProdutos(prev => prev.map(prod => {
        const itemRetirado = itens.find(i => i.produtoId === prod.id);
        if (!itemRetirado) return prod;
        return {
          ...prod,
          estoqueAtelie: prod.estoqueAtelie + itemRetirado.quantidade, // Peças voltam para o estoque!
          totalConsignado: Math.max(0, (prod.totalConsignado || 0) - itemRetirado.quantidade),
        };
      }));

      // 3. Monta comprovante de recolhimento para WhatsApp
      const cleanPhone = targetPdv.telefone.replace(/\D/g, '');
      const sendWhatsApp = () => {
        const itensFormatados = itens.map(i => {
          const prod = produtos.find(p => p.id === i.produtoId);
          return {
            produtoNome: prod?.nome || 'Chaveiro 3D',
            quantidade: i.quantidade,
            precoUnitario: prod?.precoVenda || 13.00,
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

      showToast(`Recolhimento concluído: +${totalPecas} peças retornaram ao estoque do Ateliê!`, sendWhatsApp);
      return;
    }

    // MODO ABASTECIMENTO: ATELIÊ -> PDV
    const novoTotal = targetPdv.totalPecasNoDisplay + totalPecas;

    // 1. Atualiza estoque do PDV
    setPdvs(prev => prev.map(p => {
      if (p.id !== pdvId) return p;
      return {
        ...p,
        totalPecasNoDisplay: novoTotal,
        valorTotalConsignado: novoTotal * 13.00,
        dataUltimaVisita: new Date().toISOString(),
      };
    }));

    // 2. Desconta do estoque do ateliê e adiciona ao total consignado
    setProdutos(prev => prev.map(prod => {
      const itemRestock = itens.find(i => i.produtoId === prod.id);
      if (!itemRestock) return prod;
      return {
        ...prod,
        estoqueAtelie: Math.max(0, prod.estoqueAtelie - itemRestock.quantidade),
        totalConsignado: (prod.totalConsignado || 0) + itemRestock.quantidade,
      };
    }));

    // 3. Monta comprovante do WhatsApp para envio ao lojista
    const cleanPhone = targetPdv.telefone.replace(/\D/g, '');
    const sendWhatsApp = () => {
      const itensFormatados = itens.map(i => {
        const prod = produtos.find(p => p.id === i.produtoId);
        return {
          produtoNome: prod?.nome || 'Chaveiro 3D',
          quantidade: i.quantidade,
          precoUnitario: prod?.precoVenda || 13.00,
        };
      });
      const msg = generateWhatsAppRestockReceipt(
        targetPdv,
        itensFormatados,
        novoTotal
      );
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
    };

    showToast(`Expositor da loja "${targetPdv.nomeLoja}" abastecido (+${totalPecas} peças)!`, sendWhatsApp);
  };

  // Save new Acerto
  const handleSaveAcerto = (novoAcerto: FechamentoAcerto) => {
    setAcertos(prev => [novoAcerto, ...prev]);

    // Update the partner store
    setPdvs(prev => prev.map(p => {
      if (p.id !== novoAcerto.pdvId) return p;

      const newPecasCount = Math.max(0, p.totalPecasNoDisplay - novoAcerto.totalPecasVendidas + novoAcerto.totalPecasRepostas);
      const diasProxima = p.frequenciaAcerto === 'semanal' ? 7 : p.frequenciaAcerto === 'quinzenal' ? 14 : 30;
      const proximaData = new Date(Date.now() + diasProxima * 86400000).toISOString();

      return {
        ...p,
        totalPecasNoDisplay: newPecasCount,
        valorTotalConsignado: newPecasCount * 13.00,
        totalVendidoAcumulado: p.totalVendidoAcumulado + novoAcerto.valorBrutoVendido,
        dataUltimaVisita: novoAcerto.dataAcerto,
        dataProximaVisita: proximaData,
        status: 'ativo',
      };
    }));

    // Update products stock & consigned
    setProdutos(prev => prev.map(prod => {
      const itemFechado = novoAcerto.itens.find(i => i.produtoId === prod.id);
      if (!itemFechado) return prod;

      return {
        ...prod,
        estoqueAtelie: Math.max(0, prod.estoqueAtelie - itemFechado.qtdReposta),
        totalConsignado: Math.max(0, prod.totalConsignado - itemFechado.qtdVendida + itemFechado.qtdReposta),
      };
    }));

    setActiveTab('acertos');

    const cleanPhone = novoAcerto.pdvTelefone.replace(/\D/g, '');
    const sendWhatsApp = () => {
      const msg = generateWhatsAppReceipt(novoAcerto);
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
    };

    showToast(`Acerto ${novoAcerto.codigoAcerto} concluído com sucesso!`, sendWhatsApp);
  };

  // Save new PDV
  const handleSavePDV = (novoPDV: PontoDeVenda) => {
    setPdvs(prev => {
      const updated = [novoPDV, ...prev];
      try {
        localStorage.setItem(STORAGE_PDVS, JSON.stringify(updated));
        // Se este ID estava na lista de excluídos, remove-o
        const savedDeleted = localStorage.getItem(STORAGE_DELETED_PDVS);
        if (savedDeleted) {
          const deletedList: string[] = JSON.parse(savedDeleted);
          const filtered = deletedList.filter(id => id !== novoPDV.id);
          localStorage.setItem(STORAGE_DELETED_PDVS, JSON.stringify(filtered));
        }
      } catch (e) {
        console.error('Erro ao salvar PDV:', e);
      }
      return updated;
    });
    showToast(`Ponto de Venda "${novoPDV.nomeLoja}" cadastrado!`);
    setActiveTab('pdvs');
  };

  // Update existing PDV
  const handleUpdatePDV = (updated: PontoDeVenda) => {
    setPdvs(prev => {
      const list = prev.map(p => p.id === updated.id ? updated : p);
      try {
        localStorage.setItem(STORAGE_PDVS, JSON.stringify(list));
      } catch (e) {
        console.error('Erro ao atualizar PDV:', e);
      }
      return list;
    });
    showToast(`Ponto de Venda "${updated.nomeLoja}" atualizado!`);
  };

  // Delete PDV (persistência imediata e registro em STORAGE_DELETED_PDVS para evitar ressurgimento)
  const handleDeletePDV = (pdvId: string) => {
    const target = pdvs.find(p => p.id === pdvId);
    
    // Atualiza estado e persiste imediatamente de forma síncrona
    setPdvs(prev => {
      const updated = prev.filter(p => p.id !== pdvId);
      try {
        localStorage.setItem(STORAGE_PDVS, JSON.stringify(updated));

        // Registra ID na lista de PDVs excluídos
        const savedDeleted = localStorage.getItem(STORAGE_DELETED_PDVS);
        const deletedList: string[] = savedDeleted ? JSON.parse(savedDeleted) : [];
        if (!deletedList.includes(pdvId)) {
          deletedList.push(pdvId);
          localStorage.setItem(STORAGE_DELETED_PDVS, JSON.stringify(deletedList));
        }
      } catch (e) {
        console.error('Erro ao persistir exclusão de PDV:', e);
      }
      return updated;
    });

    if (editingPdv?.id === pdvId) {
      setEditingPdv(null);
    }
    showToast(`Ponto de Venda "${target?.nomeLoja || 'PDV'}" excluído com sucesso!`);
  };

  // Save new Product
  const handleSaveProduct = (novoProd: Produto3D) => {
    setProdutos(prev => [novoProd, ...prev]);
    showToast(`Modelo 3D "${novoProd.nome}" adicionado ao catálogo!`);
    setActiveTab('catalogo');
  };

  // Delete Product from Catalog
  const handleDeleteProduct = (produtoId: string) => {
    const target = produtos.find(p => p.id === produtoId);
    setProdutos(prev => prev.filter(p => p.id !== produtoId));
    if (adjustingProduct?.id === produtoId) {
      setAdjustingProduct(null);
    }
    showToast(`Produto "${target?.nome || 'Produto'}" excluído do catálogo!`);
  };

  // Ajustar estoque avulso de um produto
  const handleAdjustSingleProductStock = (
    produtoId: string, 
    novoEstoque: number, 
    motivo: MotivoAjusteEstoque, 
    observacao?: string
  ) => {
    setProdutos(prev => prev.map(p => {
      if (p.id === produtoId) {
        const delta = novoEstoque - p.estoqueAtelie;
        const sinal = delta > 0 ? `+${delta}` : `${delta}`;
        showToast(`Estoque de "${p.nome}" atualizado: ${novoEstoque} un. (${sinal})`);
        return { ...p, estoqueAtelie: novoEstoque };
      }
      return p;
    }));
  };

  // Aplicar Balanço & Inventário completo (correção de divergências)
  const handleApplyInventory = (
    ajustes: { produtoId: string; novoEstoque: number; diferenca: number }[],
    motivo: string,
    observacao?: string
  ) => {
    if (ajustes.length === 0) {
      showToast('Nenhuma divergência foi alterada no inventário.');
      return;
    }

    const mapaAjustes = new Map(ajustes.map(a => [a.produtoId, a.novoEstoque]));

    setProdutos(prev => prev.map(p => {
      if (mapaAjustes.has(p.id)) {
        return { ...p, estoqueAtelie: mapaAjustes.get(p.id)! };
      }
      return p;
    }));

    // Registrar histórico do inventário no LocalStorage
    try {
      const registro = {
        id: `inv-${Date.now()}`,
        data: new Date().toISOString(),
        motivo,
        itensAlterados: ajustes.length,
        saldoDiferenca: ajustes.reduce((acc, a) => acc + a.diferenca, 0),
        observacoes: observacao,
      };
      const salvos = localStorage.getItem(STORAGE_INVENTARIOS);
      const lista = salvos ? JSON.parse(salvos) : [];
      localStorage.setItem(STORAGE_INVENTARIOS, JSON.stringify([registro, ...lista]));
    } catch (e) {
      console.error(e);
    }

    const totalDiferencaPecas = ajustes.reduce((acc, a) => acc + a.diferenca, 0);
    const sinal = totalDiferencaPecas > 0 ? `+${totalDiferencaPecas}` : `${totalDiferencaPecas}`;

    showToast(`Inventário aplicado! ${ajustes.length} produto(s) corrigido(s) no estoque (${sinal} peças no saldo).`);
  };

  // Reset base data
  const handleResetData = () => {
    if (window.confirm('Deseja restaurar os dados de exemplo dos Chaveiros & Consignados LM3D?')) {
      setPdvs(INITIAL_PDVS);
      setProdutos(INITIAL_PRODUTOS_3D);
      setAcertos(INITIAL_ACERTOS);
      try {
        localStorage.removeItem(STORAGE_DELETED_PDVS);
        localStorage.setItem(STORAGE_PDVS, JSON.stringify(INITIAL_PDVS));
        localStorage.setItem(STORAGE_PRODUTOS, JSON.stringify(INITIAL_PRODUTOS_3D));
        localStorage.setItem(STORAGE_ACERTOS, JSON.stringify(INITIAL_ACERTOS));
      } catch (e) {
        console.error('Erro ao restaurar dados:', e);
      }
      showToast('Dados restaurados com sucesso!');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setSession(null);
    showToast('Você encerrou a sessão.');
  };

  // Se não estiver autenticado, exibe a tela de login protegida
  if (!session) {
    return (
      <LoginScreen
        onLoginSuccess={(newSession) => {
          setSession(newSession);
          showToast(`Bem-vindo(a), ${newSession.usuario.nome}! Sessão mantida.`);
        }}
      />
    );
  }

  const totalPecasRua = pdvs.reduce((acc, p) => acc + p.totalPecasNoDisplay, 0);
  const alertasVisita = pdvs.filter(p => p.status === 'visita_pendente').length;

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
        onOpenNovoProduto={() => setIsNewProductModalOpen(true)}
        totalPecasRua={totalPecasRua}
        totalLojas={pdvs.length}
        alertasVisita={alertasVisita}
        usuario={session.usuario}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area with Mobile Safe Padding */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-24 sm:pb-12">
        {activeTab === 'pdvs' && (
          <PDVsTab
            pdvs={pdvs}
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
          />
        )}

        {activeTab === 'catalogo' && (
          <ProductsTab
            produtos={produtos}
            onOpenNovoProduto={() => setIsNewProductModalOpen(true)}
            onOpenInventario={() => setIsInventoryModalOpen(true)}
            onAjustarEstoqueProduto={(prod) => setAdjustingProduct(prod)}
            onExcluirProduto={handleDeleteProduct}
          />
        )}

        {activeTab === 'calculadora' && (
          <Calculator3DTab />
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            pdvs={pdvs}
            produtos={produtos}
            acertos={acertos}
            onResetData={handleResetData}
            onOpenInventario={() => setIsInventoryModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly Native App Style) */}
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
        onClose={() => setIsNewProductModalOpen(false)}
        onSave={handleSaveProduct}
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

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => showToast('Senha alterada com sucesso! Você continuará conectado.')}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">LM3D Consignados</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-xs">Chaveiros & Impressão 3D para Lojas Parceiras</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Modelos: Articulados, Geek, Motos, Letras, Suportes</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Consignação Direta</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              Sistema de gestão de rotas de visitas, reposição de displays, conferência e fechamento financeiro de chaveiros e peças em 3D.
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
