import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken, VerifiedUser } from './verify';
import { adminAuth, adminDb, isServerConfigured } from './firebase-admin';

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminUsername(): string {
  return (process.env.ADMIN_USERNAME || 'adminleadflu').toLowerCase();
}

export interface AuthContext {
  user: VerifiedUser;
  role: 'Guest' | 'Admin';
  plan: 'FREE' | 'PRO';
  isAdmin: boolean;
  username?: string | null;
  name?: string | null;
}

const ROLE_CACHE_TTL = 30_000;
const roleCache = new Map<string, { role: string; plan: string; username?: string | null; name?: string | null; at: number }>();

function isSeedAdmin(email: string | null): boolean {
  if (!email) return false;
  return (
    getAdminEmails().includes(email.toLowerCase()) ||
    email.toLowerCase() === `${getAdminUsername()}@leadflu.app`
  );
}

export function fallbackRoleFor(email: string | null): { role: 'Guest' | 'Admin'; plan: 'FREE' | 'PRO' } {
  return isSeedAdmin(email) ? { role: 'Admin', plan: 'PRO' } : { role: 'Guest', plan: 'FREE' };
}

async function resolveRoleAndPlan(
  uid: string,
  email: string | null
): Promise<{ role: 'Guest' | 'Admin'; plan: 'FREE' | 'PRO'; username?: string | null; name?: string | null }> {
  const cached = roleCache.get(uid);
  if (cached && Date.now() - cached.at < ROLE_CACHE_TTL) {
    return {
      role: cached.role as 'Guest' | 'Admin',
      plan: cached.plan as 'FREE' | 'PRO',
      username: cached.username,
      name: cached.name,
    };
  }

  const seed = fallbackRoleFor(email);
  let role: 'Guest' | 'Admin' = seed.role;
  let plan: 'FREE' | 'PRO' = seed.plan;
  let username: string | null = null;
  let name: string | null = null;

  if (isServerConfigured && adminDb) {
    try {
      const doc = await adminDb.collection('users').doc(uid).get();
      if (doc.exists) {
        const data = doc.data();
        if (data?.role === 'Admin' || data?.role === 'Guest') role = data.role;
        if (data?.plan === 'PRO' || data?.plan === 'FREE') plan = data.plan;
        if (typeof data?.username === 'string') username = data.username;
        if (typeof data?.name === 'string') name = data.name;

        // PRO membership expires: auto-downgrade to FREE
        if (plan === 'PRO' && typeof data?.expiryDate === 'number' && data.expiryDate < Date.now()) {
          plan = 'FREE';
          await adminDb.collection('users').doc(uid).update({ plan: 'FREE', expiryDate: null });
        }
      } else {
        await adminDb
          .collection('users')
          .doc(uid)
          .set({ email, role, plan, expiryDate: null, createdAt: Date.now() }, { merge: true });
      }
    } catch (error) {
      console.error('Role lookup failed, using fallback:', error);
    }
  }

  roleCache.set(uid, { role, plan, username, name, at: Date.now() });
  return { role, plan, username, name };
}

function guestContext(): AuthContext {
  return { user: { uid: '', email: null, email_verified: false }, role: 'Guest', plan: 'FREE', isAdmin: false };
}

export async function authenticateOrGuest(req: NextRequest): Promise<AuthContext> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  let verified: VerifiedUser | null = null;
  if (token) {
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        verified = {
          uid: decoded.uid,
          email: decoded.email || null,
          email_verified: !!decoded.email_verified,
        };
      } catch {
        verified = null;
      }
    } else {
      verified = await verifyFirebaseIdToken(token);
    }
  }

  if (!verified) return guestContext();

  const { role, plan, username, name } = await resolveRoleAndPlan(verified.uid, verified.email);
  return { user: verified, role, plan, isAdmin: role === 'Admin', username, name };
}

export async function authenticate(req: NextRequest): Promise<AuthContext | NextResponse> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 });
  }

  let verified: VerifiedUser | null = null;
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      verified = {
        uid: decoded.uid,
        email: decoded.email || null,
        email_verified: !!decoded.email_verified,
      };
    } catch {
      verified = null;
    }
  } else {
    verified = await verifyFirebaseIdToken(token);
  }

  if (!verified) {
    return NextResponse.json(
      { error: 'Invalid or expired session. Please sign in again.' },
      { status: 401 }
    );
  }

  const { role, plan, username, name } = await resolveRoleAndPlan(verified.uid, verified.email);
  return { user: verified, role, plan, isAdmin: role === 'Admin', username, name };
}

export async function requireAdmin(req: NextRequest): Promise<AuthContext | NextResponse> {
  const ctx = await authenticate(req);
  if (ctx instanceof NextResponse) return ctx;
  if (!ctx.isAdmin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }
  return ctx;
}
