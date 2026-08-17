'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Search,
  Database,
  Layers,
  ShieldCheck,
  FileText,
  CheckCircle2,
  GitBranch,
  Sparkles,
  Zap,
  Lock,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AIRetrievalPipelineProps {
  className?: string;
  onQueryClick?: (query: string) => void;
}

export function AIRetrievalPipeline({ className = '', onQueryClick }: AIRetrievalPipelineProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isLowConfidenceDemo, setIsLowConfidenceDemo] = useState<boolean>(false);

  // 10-second continuous looping pipeline state machine
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= 5) {
          // Every alternate loop, briefly demonstrate low confidence adaptive clarification
          setIsLowConfidenceDemo((demo) => !demo);
          return 0;
        }
        return prev + 1;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  const pipelineSteps = [
    { id: 0, label: 'Student Question', desc: 'Natural Language Query' },
    { id: 1, label: 'Query Intent & Entity', desc: 'Extraction & Tokenization' },
    { id: 2, label: 'Dual Knowledge Base', desc: 'Static & Dynamic Repositories' },
    { id: 3, label: 'Hybrid Reranker', desc: 'Cross-Encoder Scoring' },
    { id: 4, label: 'Evidence Validator', desc: 'Score & Fact Verification' },
    { id: 5, label: 'Verified Citation Answer', desc: 'Ground Truth Output' },
  ];

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* Top Header Badge */}
      <div className="flex items-center gap-2 mb-6">
        <Badge
          variant="outline"
          className="bg-white/80 dark:bg-purple-950/40 border-purple-300/50 dark:border-purple-700/50 text-purple-900 dark:text-purple-200 px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span>RAG Retrieval Architecture</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </Badge>
      </div>

      {/* Main Pipeline Container Card */}
      <div className="w-full max-w-5xl bg-white/70 dark:bg-[#120826]/70 backdrop-blur-2xl border border-purple-300/50 dark:border-purple-800/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
        {/* Background Ambient Glow Gradients */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Pipeline Nodes Flow (Horizontal Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 relative z-10">
          {/* Node 1: Student Question */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{
                scale: activeStep === 0 ? 1.05 : 1,
                borderColor: activeStep === 0 ? 'rgba(99, 102, 241, 0.8)' : 'rgba(168, 85, 247, 0.25)',
              }}
              className={`w-full p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl flex flex-col items-center ${
                activeStep === 0
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/10 shadow-lg shadow-indigo-500/20'
                  : 'bg-white/60 dark:bg-[#180d32]/60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Student Query</span>
              <span className="text-[11px] text-muted-foreground mt-1 line-clamp-1">"B.Tech CS Fees?"</span>
            </motion.div>
          </div>

          {/* Node 2: Query Intent & Entity Extraction */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{
                scale: activeStep === 1 ? 1.05 : 1,
                borderColor: activeStep === 1 ? 'rgba(168, 85, 247, 0.8)' : 'rgba(168, 85, 247, 0.25)',
              }}
              className={`w-full p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl flex flex-col items-center ${
                activeStep === 1
                  ? 'bg-gradient-to-b from-purple-500/20 to-indigo-500/10 shadow-lg shadow-purple-500/20'
                  : 'bg-white/60 dark:bg-[#180d32]/60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Query Intent</span>
              <span className="text-[11px] font-mono text-purple-600 dark:text-purple-300 mt-1">Intent: Fee_Policy</span>
            </motion.div>
          </div>

          {/* Node 3: Dual Knowledge Repositories (Static + Dynamic) */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{
                scale: activeStep === 2 ? 1.05 : 1,
                borderColor: activeStep === 2 ? 'rgba(236, 72, 153, 0.8)' : 'rgba(168, 85, 247, 0.25)',
              }}
              className={`w-full p-3.5 rounded-2xl border transition-all duration-300 backdrop-blur-xl flex flex-col items-center ${
                activeStep === 2
                  ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/10 shadow-lg shadow-pink-500/20'
                  : 'bg-white/60 dark:bg-[#180d32]/60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-2">
                <Database className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Dual Knowledge</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-mono">Static</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-700 dark:text-pink-300 font-mono">Notices</span>
              </div>
            </motion.div>
          </div>

          {/* Node 4: Hybrid Retrieval Engine & Cross-Encoder Reranker */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{
                scale: activeStep === 3 ? 1.05 : 1,
                borderColor: activeStep === 3 ? 'rgba(99, 102, 241, 0.8)' : 'rgba(168, 85, 247, 0.25)',
              }}
              className={`w-full p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl flex flex-col items-center ${
                activeStep === 3
                  ? 'bg-gradient-to-b from-indigo-500/20 to-cyan-500/10 shadow-lg shadow-indigo-500/20'
                  : 'bg-white/60 dark:bg-[#180d32]/60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2.5">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Hybrid Reranker</span>
              <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-300 mt-1">Dense + BM25</span>
            </motion.div>
          </div>

          {/* Node 5: Evidence Validator & Confidence Calculator */}
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{
                scale: activeStep === 4 ? 1.05 : 1,
                borderColor: activeStep === 4 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(168, 85, 247, 0.25)',
              }}
              className={`w-full p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl flex flex-col items-center ${
                activeStep === 4
                  ? 'bg-gradient-to-b from-emerald-500/20 to-teal-500/10 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/60 dark:bg-[#180d32]/60'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-foreground">Evidence Validator</span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">98.4% Confidence</span>
            </motion.div>
          </div>

          {/* Node 6: Verified Answer or Adaptive Branching */}
          <div className="flex flex-col items-center text-center">
            {isLowConfidenceDemo && activeStep === 5 ? (
              /* Adaptive Clarification Branch */
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1.05, opacity: 1 }}
                className="w-full p-4 rounded-2xl border border-amber-500/80 bg-gradient-to-b from-amber-500/20 to-orange-500/10 shadow-lg shadow-amber-500/20 backdrop-blur-xl flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5">
                  <GitBranch className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Clarification</span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-mono">Adaptive Query</span>
              </motion.div>
            ) : (
              /* High Confidence Verified Answer */
              <motion.div
                animate={{
                  scale: activeStep === 5 ? 1.05 : 1,
                  borderColor: activeStep === 5 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(168, 85, 247, 0.25)',
                }}
                className={`w-full p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl flex flex-col items-center ${
                  activeStep === 5
                    ? 'bg-gradient-to-b from-emerald-500/25 via-teal-500/15 to-purple-500/10 shadow-xl shadow-emerald-500/25'
                    : 'bg-white/60 dark:bg-[#180d32]/60'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mb-2.5 shadow-md shadow-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-foreground">Verified Answer</span>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <FileText className="w-3 h-3" /> #DOC-CS-104
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Live Execution Progress Bar & Citation Preview */}
        <div className="mt-8 pt-6 border-t border-purple-300/30 dark:border-purple-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
            <div className="text-xs text-muted-foreground font-medium">
              <span className="text-foreground font-bold">{pipelineSteps[activeStep].label}</span> — {pipelineSteps[activeStep].desc}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-purple-700 dark:text-purple-300 bg-purple-500/10 px-3.5 py-1.5 rounded-full border border-purple-400/20">
            <Lock className="w-3.5 h-3.5 text-purple-500" />
            <span>Zero Hallucination Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
}
