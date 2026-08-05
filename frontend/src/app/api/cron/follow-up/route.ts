import { NextResponse } from 'next/server';

// Vercel Cron Job - runs every hour to process follow-ups
export async function GET(request: Request) {
  try {
    // Verify cron secret (optional, for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the follow-up processing endpoint internally
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/follow-up/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    console.log('[Cron Follow-Up] Result:', JSON.stringify(data));

    return NextResponse.json({
      ok: true,
      ...data,
      triggeredAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('[Cron Follow-Up] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
