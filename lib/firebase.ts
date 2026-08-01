import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  User,
  UserCredential,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

let cachedAccessToken: string | null = null;

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

function extractOAuthToken(result: UserCredential): string {
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Google sign-in did not return an access token.');
  }
  cachedAccessToken = credential.accessToken;
  return credential.accessToken;
}

const REDIRECT_FALLBACK_ERRORS = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/unauthorized-domain',
]);

export interface GoogleSignInResult {
  user: User;
  accessToken: string;
  usedRedirect: boolean;
}

const ADMIN_USERNAME = (process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'adminleadflu').toLowerCase();

export const USERNAME_DOMAIN = '@leadflu.app';

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}${USERNAME_DOMAIN}`;
}

export async function adminLoginWithCredentials(username: string, password: string): Promise<User> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.customToken) {
    const error = new Error(data?.error || 'Invalid username or password.');
    (error as any).code = 'auth/invalid-credential';
    throw error;
  }
  const result = await signInWithCustomToken(auth, data.customToken);
  return result.user;
}

export async function loginWithUsername(username: string, password: string): Promise<User> {
  const normalized = username.trim().toLowerCase();
  if (normalized === ADMIN_USERNAME) {
    return adminLoginWithCredentials(normalized, password);
  }
  const result = await signInWithEmailAndPassword(auth, usernameToEmail(normalized), password);
  return result.user;
}

function getSheetsProvider(): GoogleAuthProvider {
  const sheetsProvider = new GoogleAuthProvider();
  sheetsProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
  return sheetsProvider;
}

export async function authorizeSheets(): Promise<GoogleSignInResult> {
  const sheetsProvider = getSheetsProvider();
  try {
    const result = await signInWithPopup(auth, sheetsProvider);
    return { user: result.user, accessToken: extractOAuthToken(result), usedRedirect: false };
  } catch (error: any) {
    if (error?.code === 'auth/account-exists-with-different-credential' && auth.currentUser) {
      const credential = GoogleAuthProvider.credentialFromError(error);
      if (credential) {
        const linked = await linkWithCredential(auth.currentUser, credential);
        const accessToken = (credential as { accessToken?: string }).accessToken || '';
        cachedAccessToken = accessToken || null;
        return { user: linked.user, accessToken, usedRedirect: false };
      }
    }
    if (error?.code && REDIRECT_FALLBACK_ERRORS.has(error.code)) {
      await signInWithRedirect(auth, sheetsProvider);
      return { user: auth.currentUser as User, accessToken: '', usedRedirect: true };
    }
    throw error;
  }
}

export async function completeRedirectSignIn(): Promise<GoogleSignInResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    return { user: result.user, accessToken: extractOAuthToken(result), usedRedirect: true };
  } catch (error) {
    console.error('Redirect sign-in failed:', error);
    return null;
  }
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getFirebaseIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
};

export const logout = async () => {
  cachedAccessToken = null;
  await auth.signOut();
};

export function getAuthErrorMessage(error: any): string {
  switch (error?.code) {
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by the browser. Allow popups for this site and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. The popup was closed before finishing.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. Please try again.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in. Add it in the Firebase console under Authentication > Settings > Authorized domains.';
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Check firebase-applet-config.json.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.';
    case 'auth/operation-not-supported-in-this-environment':
      return 'Popup sign-in is not supported here (e.g., inside an embedded iframe). You will be redirected to sign in instead.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists using a different sign-in method.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact the admin.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'Invalid username or password.';
    case 'auth/wrong-password':
      return 'Invalid username or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Wait a bit and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in Firebase. Enable it under Authentication > Sign-in method.';
    default:
      return error?.message || 'Sign-in failed. Please try again.';
  }
}
