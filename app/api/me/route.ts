import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (ctx instanceof NextResponse) return ctx;

  return NextResponse.json({
    success: true,
    user: {
      uid: ctx.user.uid,
      email: ctx.user.email,
      role: ctx.role,
      plan: ctx.plan,
    },
  });
}
