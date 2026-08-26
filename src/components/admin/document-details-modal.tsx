'use client';

import React from 'react';
import { AdminDocument } from './mock-data';

interface DocumentDetailsModalProps {
  document: AdminDocument | null;
  onClose: () => void;
  onReindex: (doc: AdminDocument) => void;
  onDelete: (docId: string) => void;
}

export function DocumentDetailsModal({
  document,
  onClose,
  onReindex,
  onDelete,
}: DocumentDetailsModalProps) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col p-8 rounded-3xl border border-white/40 bg-[#f9f9f9]/95 shadow-2xl space-y-6 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-3xl">description</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4441cc]/10 text-[#4441cc]">
                  {document.category}
                </span>
                <span className="text-[10px] font-bold text-[#777586] uppercase">
                  ID: {document.id}
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#1a1c1c] tracking-tight">{document.title}</h3>
              <p className="text-xs text-[#464554]">{document.fileName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#464554] hover:text-[#1a1c1c] p-1.5 rounded-xl hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/60 border border-white/40">
            <div>
              <span className="text-[10px] font-bold text-[#464554] uppercase tracking-wider block">
                File Size
              </span>
              <span className="text-sm font-bold text-[#1a1c1c]">{document.fileSize}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#464554] uppercase tracking-wider block">
                Total Pages
              </span>
              <span className="text-sm font-bold text-[#1a1c1c]">{document.pageCount} Pages</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#464554] uppercase tracking-wider block">
                Vector Chunks
              </span>
              <span className="text-sm font-bold text-[#4441cc]">{document.vectorChunks} Chunks</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#464554] uppercase tracking-wider block">
                Citation Recall
              </span>
              <span className="text-sm font-bold text-emerald-600">{document.citationScore}%</span>
            </div>
          </div>

          {/* Sample Vector Chunk Excerpt */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#1a1c1c] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#4441cc]">find_in_page</span>
              Vector Embedding Excerpt & Grounding Sample
            </h4>
            <div className="p-4 rounded-2xl bg-white/80 border border-white/50 text-xs font-mono leading-relaxed text-[#1a1c1c] shadow-inner">
              <p>"{document.excerpt}"</p>
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-[#464554] font-sans">
                <span>Embedding Model: bge-large-en (1024 dims)</span>
                <span className="text-[#4441cc] font-semibold">Metadata Tagged • Verified Citation</span>
              </div>
            </div>
          </div>

          {/* Ingestion Audit Log Timeline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#1a1c1c] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#9026c3]">account_tree</span>
              Ingestion Pipeline Audit Logs
            </h4>
            <div className="space-y-2">
              {document.ingestionLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/30 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === 'completed'
                          ? 'bg-emerald-500'
                          : log.status === 'in-progress'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <span className="font-bold text-[#1a1c1c]">{log.step}</span>
                      <span className="text-[#464554] ml-2">• {log.details}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#777586] font-mono">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/20">
          <button
            onClick={() => onDelete(document.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 text-red-700 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            <span>Delete Document</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onReindex(document)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#9026c3]/10 text-[#9026c3] text-xs font-semibold border border-[#9026c3]/20 hover:bg-[#9026c3]/20 transition-colors"
            >
              <span className="material-symbols-outlined text-base">sync</span>
              <span>Re-index Vectors</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-[#4441cc] text-white text-xs font-semibold hover:bg-[#4441cc]/90 transition-all shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
