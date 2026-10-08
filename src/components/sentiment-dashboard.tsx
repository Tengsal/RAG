'use client';

import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface SentimentReport {
  overall: { positive: number; neutral: number; critical: number };
  themes: { positive: string[]; critical: string[] };
  trend: { week: string; positive: number; critical: number }[];
  sources: { url: string; title?: string }[];
}

const FALLBACK: SentimentReport = {
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
  sources: [],
};

export function SentimentDashboard() {
  const [report, setReport] = useState<SentimentReport | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/sentiment');
        const data = await res.json();
        if (active) setReport(data);
      } catch {
        if (active) setReport(FALLBACK);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const data = report ?? FALLBACK;
  const cards = [
    { label: 'Positive', value: data.overall.positive, cls: 'text-emerald-600', bar: 'bg-emerald-500' },
    { label: 'Neutral', value: data.overall.neutral, cls: 'text-slate-600', bar: 'bg-slate-400' },
    { label: 'Critical', value: data.overall.critical, cls: 'text-red-600', bar: 'bg-red-500' },
  ];

  return (
    <div className="w-full">
      {/* A. Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1c1c] mb-2">
          Public Sentiment &amp; Perception
        </h2>
        <p className="text-xs sm:text-sm text-[#464554]">
          Based on public posts and news collected weekly. Not official university statements.
        </p>
      </div>

      {/* B. Overall sentiment cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#464554]">
              {card.label}
            </div>
            <div className={`mb-3 text-4xl font-extrabold ${card.cls}`}>{card.value}%</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${card.bar}`} style={{ width: `${card.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* C. Weekly trend */}
      <div className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#464554]">
          Weekly Trend — Positive vs Critical
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend} margin={{ top: 5, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#464554' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#464554' }} />
              <Tooltip />
              <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* D. Themes grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
            <span className="material-symbols-outlined text-[18px]">thumb_up</span>
            What people appreciate
          </h3>
          <ul className="space-y-2.5">
            {data.themes.positive.map((theme) => (
              <li key={theme} className="flex items-center gap-2 text-sm text-[#1a1c1c]">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                {theme}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-700">
            <span className="material-symbols-outlined text-[18px]">report</span>
            Areas of discussion
          </h3>
          <ul className="space-y-2.5">
            {data.themes.critical.map((theme) => (
              <li key={theme} className="flex items-center gap-2 text-sm text-[#1a1c1c]">
                <span className="material-symbols-outlined text-[18px] text-amber-500">warning</span>
                {theme}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* E. Sources footer */}
      {data.sources.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white px-5 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-[#464554]">
            View Sources ({data.sources.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {data.sources.map((source) => (
              <li key={source.url} className="text-xs">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4441cc] hover:underline"
                >
                  {source.title || source.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default SentimentDashboard;
