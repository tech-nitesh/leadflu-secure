import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
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

const provider = new GoogleAuthProvider();

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

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  try {
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, accessToken: extractOAuthToken(result), usedRedirect: false };
  } catch (error: any) {
    if (error?.code && REDIRECT_FALLBACK_ERRORS.has(error.code)) {
      await signInWithRedirect(auth, provider);
      return { user: auth.currentUser as User, accessToken: '', usedRedirect: true };
    }
    throw error;
  }
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
    default:
      return error?.message || 'Sign-in failed. Please try again.';
  }
}
