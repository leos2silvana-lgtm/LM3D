import React, { useState } from 'react';
import { 
  Store, 
  Package, 
  Receipt, 
  Calculator, 
  BarChart3, 
  PlusCircle, 
  Layers, 
  Boxes,
  Sparkles,
  User,
  KeyRound,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { UsuarioAdmin } from '../types';

interface NavbarProps {
  activeTab: 'pdvs' | 'catalogo' | 'acertos' | 'calculadora' | 'dashboard';
  setActiveTab: (tab: 'pdvs' | 'catalogo' | 'acertos' | 'calculadora' | 'dashboard') => void;
  onOpenNovoAcerto: () => void;
  onOpenNovoPDV: () => void;
  onOpenNovoProduto: () => void;
  totalPecasRua: number;
  totalLojas: number;
  alertasVisita: number;
  usuario?: UsuarioAdmin | null;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNovoAcerto,
  onOpenNovoPDV,
  onOpenNovoProduto,
  totalPecasRua,
  totalLojas,
  alertasVisita,
  usuario,
  onOpenChangePassword,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      
      {/* Top Banner / Quick Info */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-slate-950 text-xs font-semibold py-1 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('pdvs')}
              className="truncate hover:underline cursor-pointer text-left font-bold"
              title="Ir para Pontos de Venda"
            >
              LM3D Consignados • Gestão de Chaveiros & Peças 3D
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] font-bold shrink-0 ml-2">
            <span className="bg-black/15 px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
              <Boxes className="w-3 h-3 shrink-0" />
              <span>{totalPecasRua}</span>
              <span className="hidden sm:inline">chaveiros na rua</span>
            </span>
            <span className="bg-black/15 px-1.5 sm:px-2 py-0.5 rounded-md flex items-center gap-1">
              <Store className="w-3 h-3 shrink-0" />
              <span>{totalLojas}</span>
              <span className="hidden sm:inline">lojas parceiras</span>
            </span>
            {alertasVisita > 0 && (
              <span className="bg-amber-400 text-slate-950 px-1.5 sm:px-2 py-0.5 rounded-md font-black animate-pulse">
                ⚠️ {alertasVisita} <span className="hidden sm:inline">pendentes</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Brand - Clicável para voltar aos Pontos de Venda */}
          <button
            type="button"
            onClick={() => setActiveTab('pdvs')}
            className="flex items-center text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl transition-all cursor-pointer select-none active:scale-95"
            title="Ir para Pontos de Venda"
            aria-label="Ir para Pontos de Venda"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white group-hover:text-emerald-400 transition-colors leading-none">
                  LM3D
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full group-hover:bg-emerald-500/30 transition-all">
                  Consignados
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 group-hover:text-slate-300 font-medium leading-none mt-0.5 hidden xs:block transition-colors">
                Chaveiros & Produtos 3D
              </p>
            </div>
          </button>

          {/* Actions & User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Quick Button: Novo Acerto */}
            <button
              type="button"
              onClick={onOpenNovoAcerto}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline sm:hidden">Acerto</span>
              <span className="hidden sm:inline">Novo Acerto</span>
              <span className="xs:hidden font-extrabold">+Acerto</span>
            </button>

            {/* Cadastrar Loja (Desktop) */}
            <button
              type="button"
              onClick={onOpenNovoPDV}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-400" />
              <span>Cadastrar Loja</span>
            </button>

            {/* Desktop User Session Chip */}
            {usuario && (
              <div className="hidden sm:flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-slate-300 font-medium text-[11px] max-w-[130px] truncate" title={usuario.email}>
                  {usuario.email}
                </span>
                {usuario.role === 'admin' && (
                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md shrink-0">
                    Admin
                  </span>
                )}
                
                {onOpenChangePassword && (
                  <button
                    type="button"
                    onClick={onOpenChangePassword}
                    title="Alterar Senha de Acesso"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Desktop Log Out Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Encerrar sessão"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="hidden md:inline">Sair</span>
              </button>
            )}

            {/* Mobile Menu Dropdown Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center relative min-w-[40px] min-h-[40px]"
              aria-label="Abrir Menu de Opções"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-emerald-400" />
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </button>

          </div>

        </div>

        {/* Mobile Dropdown Menu Popover */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 py-3 px-2 space-y-2 animate-in fade-in slide-in-from-top-2 bg-slate-900/95 backdrop-blur-md rounded-2xl my-2 border shadow-2xl">
            {usuario && (
              <div className="px-3 py-2 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-300 truncate">
                      {usuario.nome} ({usuario.email})
                    </span>
                  </div>
                  {usuario.role === 'admin' && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md shrink-0">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNovoPDV();
                }}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-teal-400" />
                <span>+ Cadastrar Loja</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenNovoProduto();
                }}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>+ Novo Chaveiro</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {onOpenChangePassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenChangePassword();
                  }}
                  className="flex-1 py-2 px-3 bg-slate-950 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-800 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alterar Senha</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex-1 py-2 px-3 bg-rose-950/40 text-rose-300 hover:text-rose-200 text-xs font-bold rounded-xl border border-rose-900/50 flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Desktop Navigation Tabs */}
        <nav className="hidden sm:flex space-x-1 sm:space-x-2 border-t border-slate-800/80 overflow-x-auto py-2 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pdvs')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'pdvs'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Store className="w-4 h-4" />
            Pontos de Venda (PDVs)
            {alertasVisita > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {alertasVisita}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('acertos')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'acertos'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Acertos & Fechamentos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalogo')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'catalogo'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            Catálogo de Produtos 3D
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculadora')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'calculadora'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculadora Custo 3D & Preço
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Painel de Produção & Faturamento
          </button>
        </nav>
      </div>

    </header>
  );
};
