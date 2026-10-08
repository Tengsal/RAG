import { NextResponse } from 'next/server';
import { askRag } from '@/lib/rag-api';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    return NextResponse.json(await askRag(query));
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to connect to Campus AI' }, { status: 500 });
  }
}
