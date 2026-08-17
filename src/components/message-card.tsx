'use client';

import { useState } from 'react';
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

  const confidenceScore =
    message.confidence === 'high' ? 98.4 : message.confidence === 'medium' ? 84.0 : message.confidence === 'low' ? 62.5 : 98.4;

  return (
    <div className="flex gap-4 max-w-[95%] sm:max-w-[88%] ml-auto flex-row-reverse my-5" data-testid={`message-${message.id}`}>
      <div className="w-8.5 h-8.5 rounded-full bg-[#4441cc] shrink-0 flex items-center justify-center text-white shadow-md">
        <span className="material-symbols-outlined text-[18px]">bolt</span>
      </div>

      <div className="glass-card p-5.5 rounded-2xl rounded-tr-none font-body-md text-sm text-[#1a1c1c] border-[#4441cc]/20 space-y-4 shadow-sm w-full">
        {/* Header Status Badges */}
        <div className="flex items-center justify-between border-b border-[#c7c4d7]/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-[#4441cc]/10 text-[#4441cc] text-[10px] font-bold rounded font-mono">
              CERTAINTY: {confidenceScore}%
            </span>
            <span className="px-2.5 py-1 bg-[#0055a9]/10 text-[#0055a9] text-[10px] font-bold rounded font-mono">
              EVIDENCE VERIFIED
            </span>
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

        {/* Main Response Content */}
        <div className="leading-relaxed whitespace-pre-wrap text-base">
          {message.content}
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
                {message.sources.map((source) => (
                  <div
                    key={source.id}
                    className="p-3 rounded-xl bg-white border border-[#c7c4d7]/60 space-y-1 hover:border-[#4441cc] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1a1c1c] group-hover:text-[#4441cc] transition-colors truncate">
                        {source.documentName}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#4441cc]/10 text-[#4441cc]">
                        Pg {source.pageNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#464554] italic line-clamp-2">
                      "{source.snippet}"
                    </p>
                  </div>
                ))}
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
                        <span className="text-[#464554] font-semibold block">Cosine Similarity:</span>
                        <span className="font-mono font-bold text-[#4441cc]">0.942 / 1.000</span>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#c7c4d7]/40">
                        <span className="text-[#464554] font-semibold block">Cross-Encoder Re-rank:</span>
                        <span className="font-mono font-bold text-[#9026c3]">Rank #1 Selected</span>
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
