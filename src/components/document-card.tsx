'use client';

import { Document } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface DocumentCardProps {
  document: Document;
}

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <div
      className="glass-card p-6 rounded-3xl border border-[#c7c4d7] hover:border-[#4441cc] transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md"
      data-testid={`card-document-${document.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#4441cc]/10 flex items-center justify-center text-[#4441cc] flex-shrink-0 group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-2xl">description</span>
        </div>
        <div className="flex-1 min-w-0">
          {document.categoryName && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#e5eeff] text-[#4441cc] text-[11px] font-bold inline-block mb-2">
              {document.categoryName}
            </span>
          )}

          <h3 className="font-bold text-[#1a1c1c] text-base mb-1.5 group-hover:text-[#4441cc] transition-colors leading-snug">
            {document.title}
          </h3>

          {document.description && (
            <p className="text-xs text-[#464554] line-clamp-2 mb-3 leading-relaxed">
              {document.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-[#464554]/70 font-semibold">
            <span className="font-mono text-[11px]">{document.pageCount} pages</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
