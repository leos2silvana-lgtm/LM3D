import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Cloud,
  Smartphone,
  Laptop,
  Loader2,
  ExternalLink,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import {
  isRunningInsideIframe,
  loginWithEmailPassword,
  loginWithGoogle,
  registerWithEmailPassword,
  resetPasswordWithEmail,
} from '../services/authService';
import { LM3DLogo } from './LM3DLogo';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembrarConectado, setLembrarConectado] = useState(true);

  const [erro, setErro] = useState<string | null>(null);
  const [erroCode, setErroCode] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [suggestNewTab, setSuggestNewTab] = useState(() => isRunningInsideIframe());
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  const insideIframe = isRunningInsideIframe();
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErro(null);
    setErroCode(null);
    setSucessoMsg(null);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setErroCode(null);
    setSucessoMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErro('Informe seu e-mail para continuar.');
      return;
    }

    if (mode === 'reset') {
      setCarregando(true);
      const res = await resetPasswordWithEmail(trimmedEmail);
      setCarregando(false);
      if (res.success) {
        setSucessoMsg(
          `Enviamos um link de redefinição de senha para ${trimmedEmail}. Confira sua caixa de entrada e spam.`
        );
      } else {
        setErro(res.error || 'Não foi possível enviar o e-mail de recuperação.');
        setErroCode(res.code || null);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true);
    const result =
      mode === 'register'
        ? await registerWithEmailPassword(trimmedEmail, password, nome, lembrarConectado)
        : await loginWithEmailPassword(trimmedEmail, password, lembrarConectado);
    setCarregando(false);

    if (result.success) {
      if (!result.needsVerification) {
        onLoginSuccess?.();
      }
    } else if (result.error) {
      setErro(result.error);
      setErroCode(result.code || null);
    }
  };

  const handleGoogleLogin = async () => {
    setErro(null);
    setErroCode(null);
    setSucessoMsg(null);
    setCarregandoGoogle(true);
    const result = await loginWithGoogle(lembrarConectado);
    setCarregandoGoogle(false);

    if (result.success) {
      if (!result.needsVerification) {
        onLoginSuccess?.();
      }
    } else if (result.error) {
      setErro(result.error);
      setErroCode(result.code || null);
      if (result.suggestNewTab) {
        setSuggestNewTab(true);
      }
    }
  };

  const busy = carregando || carregandoGoogle;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <LM3DLogo size="xl" showInitialsBadge />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              LM3D Consignados
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
              Nuvem
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Gestão de Chaveiros, Estoque & PDVs Sincronizada
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {mode === 'login'
                    ? 'Entrar com E-mail e Senha'
                    : mode === 'register'
                    ? 'Criar Conta na Nuvem'
                    : 'Recuperar Senha'}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Sincronização automática entre PC e celular
                </p>
              </div>
            </div>
          </div>

          {/* Mode Tabs (Login / Register) */}
          {mode !== 'reset' ? (
            <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleModeChange('login')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o login
            </button>
          )}

          {/* Error Message */}
          {erro && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
              {erroCode === 'auth/operation-not-allowed' && (
                <p className="text-[11px] text-amber-300/90 pl-6 leading-relaxed">
                  Dica: Abra o{' '}
                  <strong className="text-amber-200">Firebase Console</strong> &gt;{' '}
                  <strong className="text-amber-200">Authentication</strong> &gt;{' '}
                  <strong className="text-amber-200">Sign-in method</strong> e ative o provedor{' '}
                  <strong className="text-amber-200">E-mail/senha</strong>.
                </p>
              )}
            </div>
          )}

          {/* Success Message */}
          {sucessoMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Nome (opcional)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Leonardo LM3D"
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-300">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => handleModeChange('reset')}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode !== 'reset' && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={lembrarConectado}
                  onChange={(e) => setLembrarConectado(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Permanecer sempre conectado (Login perpétuo)</span>
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {carregando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>
                {carregando
                  ? 'Conectando...'
                  : mode === 'login'
                  ? 'Entrar na Nuvem'
                  : mode === 'register'
                  ? 'Criar Conta e Entrar'
                  : 'Enviar Link de Recuperação'}
              </span>
            </button>
          </form>

          {/* Divider */}
          {mode !== 'reset' && (
            <>
              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-800" />
                <span className="shrink-0 mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  ou
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Google Sign-In Button */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={busy}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {carregandoGoogle ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.37 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                  )}
                  <span>{carregandoGoogle ? 'Conectando ao Google...' : 'Entrar com Google'}</span>
                </button>

                {(insideIframe || suggestNewTab) && (
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Abrir Site em Nova Aba</span>
                  </a>
                )}
              </div>
            </>
          )}

          {/* Sync Explanation */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span>+</span>
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Mesmo login em todos os aparelhos</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Entre com o mesmo e-mail no computador e no celular para sincronizar PDVs, estoque e acertos em tempo real.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Dados protegidos e salvos na nuvem em tempo real</span>
          </div>
        </div>

        {/* Security Note Footer */}
        <div className="text-center mt-5 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Autenticação Firebase + Sincronização em Tempo Real</span>
        </div>
      </div>
    </div>
  );
};
