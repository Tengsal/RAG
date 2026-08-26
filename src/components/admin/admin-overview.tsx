'use client';

import React from 'react';
import { MetricStat, AdminDocument } from './mock-data';

interface AdminOverviewProps {
  metrics: MetricStat[];
  documents: AdminDocument[];
  onSelectFilterStatus: (status: string) => void;
}

export function AdminOverview({ metrics, documents, onSelectFilterStatus }: AdminOverviewProps) {
  // Compute live metrics from passed documents list
  const totalCount = documents.length;
  const readyCount = documents.filter((d) => d.status === 'ready').length;
  const processingCount = documents.filter((d) => d.status === 'processing').length;
  const failedCount = documents.filter((d) => d.status === 'failed').length;

  const dynamicMetrics = metrics.map((m) => {
    if (m.id === 'total-docs') return { ...m, value: totalCount };
    if (m.id === 'ready-docs') return { ...m, value: readyCount };
    if (m.id === 'processing-docs') return { ...m, value: processingCount };
    if (m.id === 'failed-docs') return { ...m, value: failedCount };
    return m;
  });

  return (
    <div className="mb-10 space-y-6">
      {/* 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dynamicMetrics.map((stat) => (
          <div
            key={stat.id}
            onClick={() => {
              if (stat.id === 'ready-docs') onSelectFilterStatus('ready');
              else if (stat.id === 'processing-docs') onSelectFilterStatus('processing');
              else if (stat.id === 'failed-docs') onSelectFilterStatus('failed');
              else onSelectFilterStatus('all');
            }}
            className="glass-card p-6 rounded-3xl hover:border-[#4441cc]/40 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-2xl ${stat.bgClass} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}
                style={{ color: stat.colorHex }}
              >
                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  stat.isPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {stat.change}
              </span>
            </div>

            <h3 className="text-3xl font-bold text-[#1a1c1c] tracking-tight mb-1">
              {stat.value}
            </h3>
            <p className="text-xs font-semibold text-[#1a1c1c] mb-1">{stat.label}</p>
            <p className="text-[11px] text-[#464554]">{stat.subtext}</p>
          </div>
        ))}
      </div>

      {/* RAG Vector Pipeline Status Banner */}
      <div className="glass-card p-6 rounded-3xl border border-white/40 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-2xl">memory</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#1a1c1c]">Uncertainty-Aware Ingestion Pipeline</h4>
            <p className="text-xs text-[#464554]">
              PDF Parser → Text Chunking (512 tokens) → Embedding Model (bge-large-en) → Milvus DB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="text-center">
            <span className="text-xs font-bold text-[#4441cc] block">99.4%</span>
            <span className="text-[10px] text-[#464554] uppercase tracking-wider font-semibold">Citation Accuracy</span>
          </div>
          <div className="h-8 w-px bg-white/40" />
          <div className="text-center">
            <span className="text-xs font-bold text-[#9026c3] block">1,240</span>
            <span className="text-[10px] text-[#464554] uppercase tracking-wider font-semibold">Vectors Stored</span>
          </div>
          <div className="h-8 w-px bg-white/40" />
          <div className="text-center">
            <span className="text-xs font-bold text-[#10b981] block">4.2s</span>
            <span className="text-[10px] text-[#464554] uppercase tracking-wider font-semibold">Avg Latency</span>
          </div>
        </div>
      </div>
    </div>
  );
}
