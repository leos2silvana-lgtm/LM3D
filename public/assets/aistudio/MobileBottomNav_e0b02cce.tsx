import React from 'react';
import { Store, Receipt, Package, Calculator, BarChart3, Plus } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'pdvs' | 'acertos' | 'catalogo' | 'calculadora' | 'dashboard';
  setActiveTab: (tab: 'pdvs' | 'acertos' | 'catalogo' | 'calculadora' | 'dashboard') => void;
  onOpenNovoAcerto: () => void;
  alertasVisita?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenNovoAcerto,
  alertasVisita = 0,
}) => {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 sm:hidden shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5 max-w-md mx-auto">
        
        {/* PDVs / Lojas */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('pdvs');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[48px] ${
            activeTab === 'pdvs'
              ? 'text-emerald-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Store className={`w-5 h-5 transition-transform ${activeTab === 'pdvs' ? 'scale-110 text-emerald-400' : ''}`} />
            {alertasVisita > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-400 text-slate-950 text-[9px] font-black px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center animate-pulse">
                {alertasVisita}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Lojas</span>
          {activeTab === 'pdvs' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>

        {/* Acertos */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('acertos');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[48px] ${
            activeTab === 'acertos'
              ? 'text-emerald-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className={`w-5 h-5 transition-transform ${activeTab === 'acertos' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Acertos</span>
          {activeTab === 'acertos' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>

        {/* Floating Quick Action: Novo Acerto */}
        <div className="flex flex-col items-center justify-center px-1">
          <button
            type="button"
            onClick={onOpenNovoAcerto}
            title="Realizar Novo Acerto no PDV"
            className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 border-2 border-slate-900 active:scale-90 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-extrabold text-emerald-400 mt-0.5 tracking-tight">
            + Acerto
          </span>
        </div>

        {/* Catálogo 3D */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('catalogo');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[48px] ${
            activeTab === 'catalogo'
              ? 'text-emerald-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className={`w-5 h-5 transition-transform ${activeTab === 'catalogo' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Catálogo</span>
          {activeTab === 'catalogo' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>

        {/* Custos / Calculadora */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('calculadora');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[48px] ${
            activeTab === 'calculadora'
              ? 'text-emerald-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className={`w-5 h-5 transition-transform ${activeTab === 'calculadora' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Custos</span>
          {activeTab === 'calculadora' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>

        {/* Painel / Dashboard */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative min-h-[48px] ${
            activeTab === 'dashboard'
              ? 'text-emerald-400 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className={`w-5 h-5 transition-transform ${activeTab === 'dashboard' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight font-bold">Painel</span>
          {activeTab === 'dashboard' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
          )}
        </button>

      </div>
    </div>
  );
};
