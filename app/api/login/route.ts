import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, isServerConfigured } from '@/lib/server/firebase-admin';
import { getAdminUsername } from '@/lib/server/auth';
import { usernameToEmail } from '@/lib/server/users';

export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'NiteshK@1209';
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;
const ipAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (ipAttempts.get(ip) || []).filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    ipAttempts.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipAttempts.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Wait a minute and try again.', success: false },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (username !== getAdminUsername() || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid username or password.', success: false }, { status: 401 });
  }

  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: 'Server auth is not configured.', success: false },
        { status: 503 }
      );
    }

    const email = usernameToEmail(username);
    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await adminAuth.createUser({
        email,
        password: ADMIN_PASSWORD,
        displayName: 'Admin',
      });
      uid = created.uid;
    }

    await adminDb.collection('users').doc(uid).set(
      {
        username,
        name: 'Admin',
        role: 'Admin',
        plan: 'PRO',
        expiryDate: null,
        createdAt: Date.now(),
      },
      { merge: true }
    );

    const customToken = await adminAuth.createCustomToken(uid);
    return NextResponse.json({ success: true, customToken, username });
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'Could not sign you in. Please try again.', success: false }, { status: 500 });
  }
}
