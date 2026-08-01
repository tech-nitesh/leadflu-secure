import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrGuest, requireAdmin } from '@/lib/server/auth';
import { isServerConfigured } from '@/lib/server/firebase-admin';
import { listLeads, createLead } from '@/lib/server/leads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!isServerConfigured) {
    return NextResponse.json(
      { error: 'Server storage is not configured. Set FIREBASE_SERVICE_ACCOUNT.', success: false },
      { status: 503 }
    );
  }

  const ctx = await authenticateOrGuest(req);

  try {
    const leads = await listLeads(ctx);
    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('Failed to load leads:', error);
    return NextResponse.json({ error: 'Failed to load leads.', success: false }, { status: 500 });
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

  try {
    const { lead, error } = await createLead(body);
    if (error) return error;
    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error('Failed to create lead:', error);
    return NextResponse.json({ error: 'Failed to create lead.', success: false }, { status: 500 });
  }
}
