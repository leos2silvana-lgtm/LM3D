import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
  isQuotaError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null,
    isQuotaError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    const rawMsg = error.message || '';
    const isQuotaError = rawMsg.includes('Quota exceeded');
    let friendly = 'Ocorreu um erro inesperado ao sincronizar com a nuvem.';

    if (isQuotaError) {
      friendly =
        'O limite diário gratuito de operações do banco de dados foi atingido. A cota é redefinida no dia seguinte.';
    } else {
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed?.error) {
          if (String(parsed.error).includes('Quota exceeded')) {
            friendly =
              'O limite diário gratuito de operações do banco de dados foi atingido. A cota é redefinida no dia seguinte.';
          } else if (String(parsed.error).includes('Missing or insufficient permissions')) {
            friendly =
              'Permissão negada ao acessar os dados na nuvem. Verifique se você está conectado com sua conta Google verificada.';
          } else {
            friendly = String(parsed.error);
          }
        }
      } catch {
        if (rawMsg) friendly = rawMsg;
      }
    }

    return {
      hasError: true,
      errorMessage: friendly,
      isQuotaError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">
                Falha de Sincronização
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {this.state.errorMessage}
              </p>
              {this.state.isQuotaError && (
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs font-bold text-emerald-400 underline hover:text-emerald-300"
                >
                  Gerenciar cota no Console Firebase
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
