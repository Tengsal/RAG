import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limit: max 3 dispatches/min per IP
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;
const recent = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, phoneNumber, email, preferredLanguage, reasonForCall, consent } = body;

    if (!fullName || String(fullName).trim().length < 2)
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });

    const digits = String(phoneNumber || '').replace(/[^\d]/g, '');
    if (!phoneNumber || digits.length < 10)
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });

    // Email and consent are optional UI fields for now and must not block
    // the basic call request.

    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (rateLimited(ip))
      return NextResponse.json({ error: 'Too many requests — try again in a minute.' }, { status: 429 });

    // Normalize to E.164; bare 10-digit → +91
    let phone = String(phoneNumber).trim();
    if (!phone.startsWith('+')) phone = digits.length === 10 ? `+91${digits}` : `+${digits}`;

    // Map language selection to backend codes
    const languageMap: Record<string, string> = {
      'English': 'en-IN',
      'Hindi': 'hi-IN',
    };

    const payload = {
      phone,
      lead_name: String(fullName).trim(),
      email: String(email || '').trim(),
      language: languageMap[preferredLanguage] || 'en-IN',
      reason_for_call: String(reasonForCall || 'General inquiry').trim(),
      consent: true,
      consent_at: new Date().toISOString(),
    };

    const agentUrl = process.env.CAREER_AGENT_API_URL || 'http://localhost:5100';

    const res = await fetch(`${agentUrl}/api/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[voice-bridge] dispatch failed:', res.status, text);
      return NextResponse.json({ error: 'Call dispatch failed. Please try again.' }, { status: 502 });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, call_id: data.call_id || null });
  } catch (e) {
    console.error('[voice-bridge] error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}