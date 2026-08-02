import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyFirebaseIdToken, VerifiedUser } from './verify';
import { adminAuth, adminDb, isServerConfigured } from './firebase-admin';

export const MAX_PRO_DEVICES = 2;
export const DEVICE_LIMIT_MESSAGE =
  'This PRO account is already in use on 2 devices. Please use one of your existing devices, or contact the admin for help.';

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

  if (isSeedAdmin(email)) {
    if (!username) username = getAdminUsername();
    if (!name) name = 'Admin';
  }

  roleCache.set(uid, { role, plan, username, name, at: Date.now() });
  return { role, plan, username, name };
}

function guestContext(): AuthContext {
  return { user: { uid: '', email: null, email_verified: false }, role: 'Guest', plan: 'FREE', isAdmin: false };
}

// PRO members may use the account on up to MAX_PRO_DEVICES different
// browsers/devices. Each browser sends a secret "device stamp" header, and the
// account remembers which stamps it has seen. A brand-new 3rd device is
// blocked (friendly message) - the existing 2 devices keep working. The admin
// account and FREE/signed-out users are never limited.
async function enforceDeviceLimit(uid: string, req: NextRequest): Promise<NextResponse | null> {
  if (!adminDb) return null;
  const deviceId = req.headers.get('x-device-id')?.trim();
  if (!deviceId) return null;

  try {
    const ref = adminDb.collection('users').doc(uid);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data() || {};
    const devices = Array.isArray(data.devices)
      ? data.devices.filter((d: unknown): d is string => typeof d === 'string')
      : [];

    if (devices.includes(deviceId)) return null;

    if (devices.length >= MAX_PRO_DEVICES) {
      return NextResponse.json(
        { error: DEVICE_LIMIT_MESSAGE, code: 'DEVICE_LIMIT', success: false },
        { status: 403 }
      );
    }

    await ref.update({ devices: FieldValue.arrayUnion(deviceId) });
  } catch (error) {
    console.error('Device limit check failed:', error);
  }
  return null;
}

async function applyDeviceLimit(
  uid: string,
  role: 'Guest' | 'Admin',
  plan: 'FREE' | 'PRO',
  req: NextRequest
): Promise<NextResponse | null> {
  if (role === 'Guest' && plan === 'PRO') {
    return enforceDeviceLimit(uid, req);
  }
  return null;
}

export async function authenticateOrGuest(req: NextRequest): Promise<AuthContext | NextResponse> {
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
  const blocked = await applyDeviceLimit(verified.uid, role, plan, req);
  if (blocked) return blocked;
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
  const blocked = await applyDeviceLimit(verified.uid, role, plan, req);
  if (blocked) return blocked;
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
