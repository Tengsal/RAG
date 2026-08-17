'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layers, ShieldCheck, CheckCircle2, Sparkles, BrainCircuit } from 'lucide-react';

const loadingSteps = [
  { label: 'Understanding Question', icon: BrainCircuit, color: 'text-indigo-500' },
  { label: 'Searching University Documents', icon: Search, color: 'text-purple-500' },
  { label: 'Ranking Evidence', icon: Layers, color: 'text-pink-500' },
  { label: 'Verifying Sources', icon: ShieldCheck, color: 'text-emerald-500' },
  { label: 'Generating Verified Answer', icon: CheckCircle2, color: 'text-teal-500' },
];

export function AILoadingIndicator() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  const StepIcon = loadingSteps[currentStep].icon;

  return (
    <div className="flex items-center gap-4 p-5 rounded-3xl bg-white/80 dark:bg-[#150a29]/80 backdrop-blur-2xl border border-purple-200/50 dark:border-purple-800/40 shadow-xl max-w-xl mx-auto my-6">
      <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 shadow-inner">
        <Sparkles className="w-5 h-5 animate-spin" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 text-sm font-bold text-foreground"
            >
              <StepIcon className={`w-4 h-4 ${loadingSteps[currentStep].color}`} />
              <span>{loadingSteps[currentStep].label}</span>
            </motion.div>
          </AnimatePresence>

          <span className="text-xs font-mono text-muted-foreground font-semibold">
            Step {currentStep + 1} of 5
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-purple-500/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / loadingSteps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
