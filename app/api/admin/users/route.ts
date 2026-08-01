import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { isServerConfigured } from '@/lib/server/firebase-admin';
import { listUsers, createUser } from '@/lib/server/users';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const users = await listUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Failed to load users:', error);
    return NextResponse.json({ error: 'Failed to load users.', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.', success: false }, { status: 400 });
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!username || !/^[a-z0-9_.-]{3,}$/.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3+ characters using letters, numbers, dots, dashes or underscores.' },
      { status: 400 }
    );
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const plan = body.plan === 'PRO' ? 'PRO' : 'FREE';

  try {
    const user = await createUser({ username, password, name, plan });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
    }
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}
