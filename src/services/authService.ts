import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { SessaoAuth, UsuarioAdmin } from '../types';
import { isBootstrappedAdminEmail } from './firestoreSync';

export interface AuthActionResult {
  success: boolean;
  user?: User;
  needsVerification?: boolean;
  error?: string;
  code?: string;
  suggestNewTab?: boolean;
}

export function mapFirebaseUserToSession(
  user: User,
  role?: 'admin' | 'user',
  remember = true
): SessaoAuth {
  const resolvedRole: 'admin' | 'user' =
    role || (isBootstrappedAdminEmail(user.email) ? 'admin' : 'user');

  const usuario: UsuarioAdmin = {
    email: user.email || '',
    nome: user.displayName || user.email || 'Administrador LM3D',
    role: resolvedRole,
  };

  return {
    usuario,
    loggedAt: new Date().toISOString(),
    remember,
  };
}

export function isRunningInsideIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

async function applyPersistence(remember = true): Promise<void> {
  const preferred = remember ? browserLocalPersistence : browserSessionPersistence;
  try {
    await setPersistence(auth, preferred);
  } catch {
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch {
      // fallback to default in-memory persistence
    }
  }
}

function mapEmailAuthError(error: unknown): { code: string; message: string } {
  const errObj = error as { code?: string; message?: string };
  const code = errObj?.code || '';
  const rawMessage = errObj?.message || '';

  if (code === 'auth/operation-not-allowed' || rawMessage.includes('PASSWORD_LOGIN_DISABLED')) {
    return {
      code: code || 'auth/operation-not-allowed',
      message:
        'O login por E-mail e Senha ainda não está ativado no Firebase Console (auth/operation-not-allowed). Ative em Authentication > Sign-in method > E-mail/senha.',
    };
  }

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return {
      code,
      message: `E-mail ou senha incorretos (${code}). Se ainda não criou esta conta no Firebase, clique na aba "Criar Conta" abaixo.`,
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      code,
      message: `Este e-mail já está cadastrado (${code}). Use a aba "Entrar" para acessar com sua senha.`,
    };
  }

  if (code === 'auth/weak-password') {
    return {
      code,
      message: `A senha deve ter pelo menos 6 caracteres (${code}).`,
    };
  }

  if (code === 'auth/invalid-email') {
    return {
      code,
      message: `Digite um endereço de e-mail válido (${code}).`,
    };
  }

  if (code === 'auth/too-many-requests') {
    return {
      code,
      message: `Muitas tentativas seguidas (${code}). Aguarde alguns instantes e tente novamente.`,
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      code,
      message: `Falha de conexão com a internet (${code}). Verifique sua rede e tente novamente.`,
    };
  }

  return {
    code,
    message: `Não foi possível autenticar (${code || rawMessage || 'erro desconhecido'}).`,
  };
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  remember = true
): Promise<AuthActionResult> {
  try {
    await applyPersistence(remember);
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return {
      success: true,
      user: result.user,
      needsVerification: !result.user.emailVerified,
    };
  } catch (error: unknown) {
    const mapped = mapEmailAuthError(error);
    console.error('Erro no login com e-mail e senha:', mapped.code, error);
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  nome?: string,
  remember = true
): Promise<AuthActionResult> {
  try {
    await applyPersistence(remember);
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (nome && nome.trim()) {
      try {
        await updateProfile(result.user, { displayName: nome.trim() });
      } catch {
        // optional profile displayName update
      }
    }
    try {
      await sendEmailVerification(result.user);
    } catch {
      // user can request verification resend on the verification screen
    }
    return {
      success: true,
      user: result.user,
      needsVerification: !result.user.emailVerified,
    };
  } catch (error: unknown) {
    const mapped = mapEmailAuthError(error);
    console.error('Erro ao criar conta com e-mail e senha:', mapped.code, error);
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }
}

export async function resetPasswordWithEmail(email: string): Promise<{
  success: boolean;
  error?: string;
  code?: string;
}> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (error: unknown) {
    const mapped = mapEmailAuthError(error);
    return {
      success: false,
      code: mapped.code,
      error: mapped.message,
    };
  }
}

export async function resendVerificationEmail(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!auth.currentUser) {
    return { success: false, error: 'Nenhuma conta conectada no momento.' };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (error: unknown) {
    const mapped = mapEmailAuthError(error);
    return { success: false, error: mapped.message };
  }
}

export async function loginWithGoogle(remember = true): Promise<AuthActionResult> {
  try {
    await applyPersistence(remember);

    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user.emailVerified) {
      return {
        success: true,
        user: result.user,
        needsVerification: true,
      };
    }
    return { success: true, user: result.user };
  } catch (error: unknown) {
    const errObj = error as { code?: string; message?: string };
    const code = errObj?.code || '';
    console.error('Erro no login com Google:', code, errObj?.message || error);

    if (code === 'auth/popup-blocked') {
      return {
        success: false,
        code,
        suggestNewTab: true,
        error:
          'O navegador bloqueou a janela do Google (auth/popup-blocked). Permita pop-ups ou use o login com E-mail e Senha acima.',
      };
    }

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        success: false,
        code,
        suggestNewTab: true,
        error:
          `A janela do Google foi fechada antes de concluir (${code}). Tente novamente ou entre com E-mail e Senha acima.`,
      };
    }

    if (code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      return {
        success: false,
        code,
        suggestNewTab: false,
        error: `Domínio não autorizado para login Google (${host} - ${code}). Use o login com E-mail e Senha acima ou adicione "${host}" em Firebase Console > Authentication > Settings > Authorized domains.`,
      };
    }

    if (code === 'auth/operation-not-allowed') {
      return {
        success: false,
        code,
        suggestNewTab: false,
        error:
          'O provedor Google não está ativado no Firebase Authentication (auth/operation-not-allowed).',
      };
    }

    if (code === 'auth/web-storage-unsupported') {
      return {
        success: false,
        code,
        suggestNewTab: true,
        error:
          'O navegador bloqueou cookies/armazenamento nesta janela incorporada (auth/web-storage-unsupported). Clique em "Abrir Site em Nova Aba".',
      };
    }

    return {
      success: false,
      code,
      suggestNewTab: true,
      error: `Não foi possível entrar com o Google (${code || errObj?.message || 'erro de conexão'}). Tente o login com E-mail e Senha acima.`,
    };
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
