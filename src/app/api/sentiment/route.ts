import { NextResponse } from 'next/server';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

// Mirrors backend/api.py::_SENTIMENT_MOCK — keeps the dashboard rendering when
// the Python backend is not running.
const MOCK = {
  overall: { positive: 62, neutral: 23, critical: 15 },
  themes: {
    positive: ['Faculty Support', 'Campus Infrastructure', 'Course Variety'],
    critical: ['Fee Structure', 'Hostel Facilities', 'Placement Speed'],
  },
  trend: [
    { week: 'Week 1', positive: 64, critical: 12 },
    { week: 'Week 2', positive: 61, critical: 14 },
    { week: 'Week 3', positive: 66, critical: 11 },
    { week: 'Week 4', positive: 62, critical: 15 },
  ],
  sources: [
    { url: 'https://reddit.com/r/adtu', title: 'Discussion on ADTU placements' },
    { url: 'https://news.example.com/adtu-ai-lab', title: 'ADTU announces new AI lab' },
  ],
};

export async function GET() {
  try {
    const res = await fetch(`${RAG_API_URL}/api/sentiment`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Backend responded ${res.status}`);
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('Sentiment API fallback:', error);
    return NextResponse.json(MOCK);
  }
}
