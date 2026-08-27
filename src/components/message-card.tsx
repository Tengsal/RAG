'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/lib/types';

interface MessageCardProps {
  message: Message;
  onFollowUpClick?: (question: string) => void;
  onClarificationClick?: (option: string) => void;
}

const executionPipelineNodes = [
  { name: 'Query Understanding', icon: 'psychology' },
  { name: 'Query Embedding', icon: 'layers' },
  { name: 'Adaptive Retrieval', icon: 'route' },
  { name: 'Vector Search', icon: 'search' },
  { name: 'Cross-Encoder Reranking', icon: 'sort' },
  { name: 'Evidence Validation', icon: 'verified_user' },
  { name: 'Uncertainty Estimation', icon: 'monitoring' },
  { name: 'Citation Generation', icon: 'description' },
  { name: 'Verified Answer', icon: 'task_alt' },
];

export function MessageCard({ message, onFollowUpClick, onClarificationClick }: MessageCardProps) {
  const [showSources, setShowSources] = useState(true);
  const [showEvidenceExplorer, setShowEvidenceExplorer] = useState(false);
  const [showPipelineTrace, setShowPipelineTrace] = useState(false);
  const [highlightedSource, setHighlightedSource] = useState<string | null>(null);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-3 max-w-[85%] sm:max-w-[75%] my-4" data-testid={`message-${message.id}`}>
        <div className="w-8 h-8 rounded-full bg-[#e8e8e8] shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
        <div className="bg-[#eeeeee] p-4 rounded-2xl rounded-tl-none font-body-md text-sm text-[#1a1c1c] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Backend is the source of truth for confidence — never recalculate locally
  const isCasual = message.intent === 'casual';
  const isRefuse = message.status === 'REFUSE';
  const isClarify = message.status === 'CLARIFY';
  const isError = message.intent === 'error';
  const showVerifiedBadge =
    !isCasual && !isRefuse && !isClarify && !isError &&
    (message.confidence === 'high' || message.confidence === 'medium');
  const confidencePercent =
    message.confidenceScore != null
      ? `${Math.round(message.confidenceScore * 100)}%`
      : (message.confidence ?? '').toUpperCase();
  const topSourceScore = message.sources?.length
    ? Math.max(...message.sources.map((s) => s.retrievalScore))
    : null;

  const basename = (path: string) => (path || '').split('/').pop() || path;

  const handleCitationClick = (sourceKey: string) => {
    setShowSources(true);
    setHighlightedSource(sourceKey);
    requestAnimationFrame(() => {
      sourceRefs.current[sourceKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  // Renders inline [Source: filename | Page X] citations as clickable chips that
  // scroll to and highlight the matching source card in the sources panel.
  const CITATION_REGEX = /\[Source:\s*([^|\]]+?)\s*\|\s*Page\s*(\d+)\]/g;
  const renderContentWithCitations = (text: string) => {
    const parts: React.ReactNode[] = [];
    const re = new RegExp(CITATION_REGEX.source, 'g');
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const sourceKey = `${basename(match[1].trim())}|${parseInt(match[2], 10)}`;
      parts.push(
        <button
          key={`cite-${match.index}`}
          onClick={() => handleCitationClick(sourceKey)}
          className="inline px-1.5 py-0.5 mx-0.5 rounded bg-[#4441cc]/10 text-[#4441cc] font-mono text-[12px] font-bold hover:bg-[#4441cc]/20 transition-colors cursor-pointer"
          title="Jump to source"
        >
          {match[0]}
        </button>
      );
      lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  return (
    <div className="flex gap-4 max-w-[95%] sm:max-w-[88%] ml-auto flex-row-reverse my-5" data-testid={`message-${message.id}`}>
      <div className="w-8.5 h-8.5 rounded-full bg-[#4441cc] shrink-0 flex items-center justify-center text-white shadow-md">
        <span className="material-symbols-outlined text-[18px]">bolt</span>
      </div>

      <div className="glass-card p-5.5 rounded-2xl rounded-tr-none font-body-md text-sm text-[#1a1c1c] border-[#4441cc]/20 space-y-4 shadow-sm w-full">
        {/* Header Status Badges */}
        <div className="flex items-center justify-between border-b border-[#c7c4d7]/30 pb-3">
          <div className="flex items-center gap-2">
            {!isCasual && !isError && message.confidence && (
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded font-mono ${
                message.confidence === 'low'
                  ? 'bg-[#ba1a1a]/10 text-[#ba1a1a]'
                  : message.confidence === 'medium'
                    ? 'bg-[#b45309]/10 text-[#b45309]'
                    : 'bg-[#4441cc]/10 text-[#4441cc]'
              }`}>
                CERTAINTY: {confidencePercent}
              </span>
            )}
            {showVerifiedBadge && (
              <span className="px-2.5 py-1 bg-[#0055a9]/10 text-[#0055a9] text-[10px] font-bold rounded font-mono">
                EVIDENCE VERIFIED
              </span>
            )}
          </div>

          <button
            onClick={() => setShowPipelineTrace(!showPipelineTrace)}
            className="text-[11px] font-bold text-[#4441cc] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">hub</span>
            <span>{showPipelineTrace ? 'Hide Pipeline Trace' : 'View Pipeline Trace'}</span>
          </button>
        </div>

        {/* Live Execution Pipeline Trace Drawer */}
        <AnimatePresence>
          {showPipelineTrace && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3.5 rounded-xl bg-[#e5eeff]/50 border border-[#c7c4d7]/60 space-y-2">
                <p className="text-[11px] font-bold text-[#4441cc] uppercase tracking-wider">
                  Adaptive Retrieval Execution Sequence
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {executionPipelineNodes.map((node, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-white border border-[#c7c4d7]/40 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-[#4441cc]">{node.icon}</span>
                      <span className="text-[10px] font-bold text-[#1a1c1c] truncate">{node.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Response Content (inline citations rendered as clickable chips) */}
        <div className="leading-relaxed whitespace-pre-wrap text-base">
          {renderContentWithCitations(message.content)}
        </div>

        {/* Evidence Citation Panel */}
        {message.sources && message.sources.length > 0 && (
          <div className="pt-3 border-t border-[#c7c4d7]/30 space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowSources(!showSources)}
                className="text-xs font-bold text-[#4441cc] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">description</span>
                <span>Verified Source Documents ({message.sources.length})</span>
                <span className="material-symbols-outlined text-sm">{showSources ? 'expand_less' : 'expand_more'}</span>
              </button>

              <button
                onClick={() => setShowEvidenceExplorer(!showEvidenceExplorer)}
                className="text-xs font-bold text-[#9026c3] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">search_insights</span>
                <span>{showEvidenceExplorer ? 'Close Explorer' : 'Evidence Explorer'}</span>
              </button>
            </div>

            {showSources && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {message.sources.map((source) => {
                  const sourceKey = `${basename(source.documentName)}|${source.pageNumber}`;
                  const isHighlighted = highlightedSource === sourceKey;
                  return (
                    <div
                      key={source.id ?? sourceKey}
                      ref={(el) => { sourceRefs.current[sourceKey] = el; }}
                      className={`p-3 rounded-xl bg-white border space-y-1 transition-colors group cursor-pointer ${
                        isHighlighted
                          ? 'border-[#4441cc] ring-2 ring-[#4441cc]/30 bg-[#dae2fd]/40'
                          : 'border-[#c7c4d7]/60 hover:border-[#4441cc]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#1a1c1c] group-hover:text-[#4441cc] transition-colors truncate">
                          {source.documentName}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#4441cc]/10 text-[#4441cc]">
                            {source.retrievalScore.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#4441cc]/10 text-[#4441cc]">
                            Pg {source.pageNumber}
                          </span>
                        </span>
                      </div>
                      {source.snippet ? (
                        <p className="text-[11px] text-[#464554] italic line-clamp-2">
                          "{source.snippet}"
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Signature Evidence Explorer Drawer */}
            <AnimatePresence>
              {showEvidenceExplorer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden pt-2"
                >
                  <div className="p-4 rounded-2xl bg-[#f3f3f4] border border-[#c7c4d7] space-y-2 text-xs">
                    <h4 className="font-bold text-[#1a1c1c] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#4441cc] text-base">analytics</span>
                      <span>Vector Relevance & Reranker Diagnostics</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-white border border-[#c7c4d7]/40">
                        <span className="text-[#464554] font-semibold block">Top Source Score:</span>
                        <span className="font-mono font-bold text-[#4441cc]">
                          {topSourceScore != null ? topSourceScore.toFixed(3) : '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#c7c4d7]/40">
                        <span className="text-[#464554] font-semibold block">Evidence Chunks Used:</span>
                        <span className="font-mono font-bold text-[#9026c3]">
                          {message.sources?.length ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Clarification Options if Uncertainty Detected */}
        {message.clarificationOptions && message.clarificationOptions.length > 0 && (
          <div className="pt-3 border-t border-[#c7c4d7]/30 space-y-2">
            <p className="text-xs font-bold text-[#ba1a1a] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">help</span>
              <span>Uncertainty Detected — Please clarify query context:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {message.clarificationOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => onClarificationClick?.(option)}
                  className="px-3.5 py-1.5 rounded-full bg-[#e5eeff] border border-[#c7c4d7] hover:border-[#4441cc] hover:bg-[#d3e4fe] transition-all text-xs font-semibold text-[#4441cc]"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Follow-ups */}
        {message.followUpQuestions && message.followUpQuestions.length > 0 && (
          <div className="pt-3 border-t border-[#c7c4d7]/30 space-y-2">
            <p className="text-xs font-bold text-[#464554]">Suggested follow-up questions:</p>
            <div className="flex flex-wrap gap-2">
              {message.followUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onFollowUpClick?.(q)}
                  className="px-3 py-1.5 rounded-lg bg-[#eeeeee] hover:bg-[#e8e8e8] transition-all text-xs font-medium text-[#464554] text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
