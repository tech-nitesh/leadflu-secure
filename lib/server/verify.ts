import firebaseConfig from '@/firebase-applet-config.json';

export interface VerifiedUser {
  uid: string;
  email: string | null;
  email_verified: boolean;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    if (!user) return null;
    return {
      uid: user.localId,
      email: user.email || null,
      email_verified: !!user.emailVerified,
    };
  } catch {
    return null;
  }
}
