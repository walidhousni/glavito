import { NextResponse } from 'next/server';

// Simple preview endpoint stub – once the CMS is wired, this can enable draft preview.

export async function GET() {
  // In a real setup we would validate a secret token from the CMS and set Next.js preview cookies.
  // For now we just return a stub response so the route exists.
  return NextResponse.json({ ok: true, preview: false });
}


