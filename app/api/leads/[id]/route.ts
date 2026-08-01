import { NextRequest, NextResponse } from 'next/server';
import { authenticate, requireAdmin } from '@/lib/server/auth';
import { isServerConfigured } from '@/lib/server/firebase-admin';
import { getLead, updateLead, deleteLead } from '@/lib/server/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ctx = await authenticate(req);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  try {
    const lead = await getLead(id, ctx);
    if (!lead) return NextResponse.json({ error: 'Lead not found.', success: false }, { status: 404 });
    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Failed to load lead:', error);
    return NextResponse.json({ error: 'Failed to load lead.', success: false }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;
  try {
    const lead = await updateLead(id, body);
    if (!lead) return NextResponse.json({ error: 'Lead not found.', success: false }, { status: 404 });
    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Failed to update lead:', error);
    return NextResponse.json({ error: 'Failed to update lead.', success: false }, { status: 500 });
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
  try {
    const deleted = await deleteLead(id);
    if (!deleted) return NextResponse.json({ error: 'Lead not found.', success: false }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete lead:', error);
    return NextResponse.json({ error: 'Failed to delete lead.', success: false }, { status: 500 });
  }
}
