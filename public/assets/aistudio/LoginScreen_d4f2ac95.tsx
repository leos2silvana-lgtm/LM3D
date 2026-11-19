import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  Sparkles,
  X
} from 'lucide-react';
import { 
  authenticateUser, 
  getStoredCredentials, 
  isFirstAccessDone, 
  markFirstAccessDone 
} from '../services/authService';
import { SessaoAuth } from '../types';
import { LM3DLogo } from './LM3DLogo';

interface LoginScreenProps {
  onLoginSuccess: (session: SessaoAuth) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const creds = getStoredCredentials();
  
  const [identificador, setIdentificador] = useState(creds.email || 'leos2silvana@gmail.com');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembrarConectado, setLembrarConectado] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Oculta automaticamente o card de primeiro acesso caso o usuário já tenha feito login
  const [showFirstAccessHint, setShowFirstAccessHint] = useState(() => !isFirstAccessDone());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!identificador.trim()) {
      setErro('Por favor, informe seu usuário ou e-mail.');
      return;
    }

    if (!senha.trim()) {
      setErro('Por favor, digite sua senha de acesso.');
      return;
    }

    setCarregando(true);

    // Simulação leve para feedback visual tátil
    setTimeout(() => {
      const result = authenticateUser(identificador, senha, lembrarConectado);
      setCarregando(false);

      if (result.success && result.session) {
        // Marca que o acesso foi realizado com sucesso
        markFirstAccessDone();
        setShowFirstAccessHint(false);
        onLoginSuccess(result.session);
      } else {
        setErro(result.error || 'Credenciais inválidas.');
      }
    }, 200);
  };

  const handlePreencherAcessoPadrao = () => {
    setIdentificador(creds.email);
    let senhaDefault = 'lm3d2026';
    try {
      senhaDefault = atob(creds.senhaHash);
    } catch {
      // fallback
    }
    setSenha(senhaDefault);
    setErro(null);
  };

  const handleDismissFirstAccess = () => {
    markFirstAccessDone();
    setShowFirstAccessHint(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <LM3DLogo size="xl" showInitialsBadge />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              LM3D Consignados
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
              LM3D
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Painel Privado de Gestão de Chaveiros & PDVs Parceiros
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Autenticação de Acesso
              </h2>
              <p className="text-[11px] text-slate-400">
                Acesso restrito ao proprietário e administrador
              </p>
            </div>
          </div>

          {/* Error Message */}
          {erro && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* User/Email */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Usuário ou E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="Seu e-mail ou 'admin'"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 text-white text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha secreta"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 text-white text-sm rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Manter Conectado Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={lembrarConectado}
                  onChange={(e) => setLembrarConectado(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 transition-colors cursor-pointer"
                />
                <div className="text-xs text-slate-300 group-hover:text-white transition-colors">
                  <span className="font-semibold">Permanecer sempre conectado</span>
                  <span className="block text-[11px] text-slate-400">
                    Não pede logout ao fechar ou atualizar o navegador
                  </span>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full mt-3 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {carregando ? 'Verificando acesso...' : 'Entrar no Sistema LM3D'}
            </button>

          </form>

          {/* Quick Access Info Card (SÓ aparece no primeiro acesso antes de logar) */}
          {showFirstAccessHint && (
            <div className="mt-6 pt-5 border-t border-slate-800 text-xs animate-fadeIn">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 relative">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Credenciais de Primeiro Acesso:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreencherAcessoPadrao}
                      className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors"
                    >
                      Preencher
                    </button>
                    <button
                      type="button"
                      onClick={handleDismissFirstAccess}
                      title="Ocultar lembrete"
                      className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900 p-2 rounded-xl border border-slate-800 text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Usuário:</span>
                    <span className="text-emerald-300 font-bold truncate block" title={creds.email}>
                      {creds.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Senha Padrão:</span>
                    <span className="text-amber-300 font-bold">lm3d2026</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  * Este lembrete sumirá automaticamente após seu primeiro login.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Security Note Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Sessão segura com persistência local criptografada</span>
        </div>

      </div>

    </div>
  );
};
