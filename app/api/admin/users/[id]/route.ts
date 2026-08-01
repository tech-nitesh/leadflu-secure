import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { isServerConfigured } from '@/lib/server/firebase-admin';
import { updateUser, renewPro, deleteUser } from '@/lib/server/users';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.', success: false }, { status: 400 });
  }

  try {
    if (body.renew === true) {
      const user = await renewPro(id);
      if (!user) return NextResponse.json({ error: 'User not found.', success: false }, { status: 404 });
      return NextResponse.json({ success: true, user });
    }

    const updates: { plan?: 'PRO' | 'FREE'; name?: string } = {};
    if (body.plan === 'PRO' || body.plan === 'FREE') updates.plan = body.plan;
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();

    if (id === ctx.user.uid && updates.plan === 'FREE') {
      return NextResponse.json({ error: 'You cannot remove your own PRO access.', success: false }, { status: 400 });
    }

    const user = await updateUser(id, updates);
    if (!user) return NextResponse.json({ error: 'User not found.', success: false }, { status: 404 });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user.', success: false }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ctx = await requireAdmin(req);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  if (id === ctx.user.uid) {
    return NextResponse.json({ error: 'You cannot delete your own account.', success: false }, { status: 400 });
  }

  try {
    const deleted = await deleteUser(id);
    if (!deleted) return NextResponse.json({ error: 'User not found.', success: false }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete user.', success: false }, { status: 500 });
  }
}
