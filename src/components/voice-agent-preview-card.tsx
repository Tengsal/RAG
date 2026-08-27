'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceAgentPreviewCardProps {
  onCallClick: () => void;
}

export function VoiceAgentPreviewCard({ onCallClick }: VoiceAgentPreviewCardProps) {
  const [voiceState, setVoiceState] = useState<'speaking' | 'listening' | 'idle'>('speaking');
  const [stepIndex, setStepIndex] = useState<number>(0);

  // Staggered conversation animation sequence
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Light-mode Crisp Glass Container */}
      <div className="glass-card rounded-[32px] bg-white/90 backdrop-blur-xl p-6 sm:p-8 overflow-hidden relative border border-[#c7c4d7]/40 shadow-[0_20px_50px_rgba(68,65,204,0.08)]">
        
        {/* Top Header & Product Preview Label */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#c7c4d7]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4441cc]/10 text-[#4441cc] border border-[#4441cc]/20 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">graphic_eq</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1c1c] tracking-tight">
                ADTU Campus Voice AI
              </h3>
              <p className="text-xs text-[#464554] opacity-80 font-medium">
                Voice Call Experience
              </p>
            </div>
          </div>

          {/* Product Preview Badge */}
          <div className="px-3 py-1 bg-[#eeeeee] text-[#777586] rounded-full text-[11px] font-semibold border border-[#c7c4d7]/40 flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-xs">preview</span>
            <span>Product Preview • Example Conversation</span>
          </div>
        </div>

        {/* Centerpiece Light-Mode Voice AI Orb */}
        <div className="flex flex-col items-center justify-center my-4 py-2 relative">
          
          {/* Outer Breathing Rings */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
            
            {/* Ring 1 - Soft Electric Blue Aura */}
            <motion.div
              className="absolute inset-0 rounded-full bg-[#4441cc]/15 blur-xl"
              animate={{
                scale: voiceState === 'speaking' ? [1, 1.2, 1] : voiceState === 'listening' ? [1, 1.1, 1] : [1, 1.04, 1],
                opacity: voiceState === 'speaking' ? [0.4, 0.7, 0.4] : [0.2, 0.4, 0.2],
              }}
              transition={{ duration: voiceState === 'speaking' ? 1.8 : 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Ring 2 - Rotating Dashed Circle */}
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-dashed border-[#4441cc]/25"
              animate={{ rotate: 360 }}
              transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            />

            {/* Ring 3 - Clean White Shield Ring */}
            <motion.div
              className="absolute inset-4 rounded-full bg-white shadow-sm border border-[#c7c4d7]/30"
              animate={{
                scale: voiceState === 'speaking' ? [0.97, 1.03, 0.97] : [1, 1.01, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Core Voice AI Orb */}
            <motion.div
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#4441cc] via-[#5e5ce6] to-[#9026c3] flex items-center justify-center text-white shadow-[0_10px_25px_rgba(68,65,204,0.3)] cursor-pointer"
              whileHover={{ scale: 1.05 }}
              animate={{
                scale: voiceState === 'speaking' ? [1, 1.06, 1] : voiceState === 'listening' ? [1, 1.03, 1] : [1, 1.01, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="material-symbols-outlined text-4xl">
                {voiceState === 'listening' ? 'mic' : voiceState === 'speaking' ? 'volume_up' : 'phone_in_talk'}
              </span>
            </motion.div>
          </div>

          {/* Status Badge */}
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f3f3f4] text-xs font-bold text-[#1a1c1c] border border-[#c7c4d7]/40 shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  voiceState === 'speaking' ? 'bg-emerald-500 animate-ping' :
                  voiceState === 'listening' ? 'bg-[#9026c3] animate-pulse' : 'bg-gray-400'
                }`}
              />
              {voiceState === 'speaking' ? 'Campus AI is speaking' :
               voiceState === 'listening' ? 'Campus AI is listening' : 'Ready to talk'}
            </span>
          </div>

          {/* Dynamic Waveform Bars */}
          <div className="flex items-center gap-1.5 h-7 mt-3 px-4 py-1 bg-[#f3f3f4] rounded-full border border-[#c7c4d7]/30">
            {[30, 70, 45, 95, 60, 85, 40, 75, 90, 50, 65, 35].map((h, i) => (
              <motion.div
                key={i}
                className={`w-1 rounded-full ${
                  voiceState === 'speaking' ? 'bg-[#4441cc]' :
                  voiceState === 'listening' ? 'bg-[#9026c3]' : 'bg-gray-300'
                }`}
                animate={{
                  height: voiceState !== 'idle'
                    ? [`${Math.max(20, h * 0.3)}%`, `${Math.max(30, h)}%`, `${Math.max(20, h * 0.4)}%`]
                    : '20%',
                }}
                transition={{
                  duration: 0.6 + (i % 4) * 0.2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* State Switcher Controls */}
          <div className="flex items-center gap-1 mt-3 p-1 bg-[#eeeeee] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setVoiceState('speaking')}
              className={`px-3 py-1 rounded-lg transition-all ${
                voiceState === 'speaking' ? 'bg-[#4441cc] text-white font-bold shadow-sm' : 'text-[#464554] hover:bg-white/60'
              }`}
            >
              Speaking
            </button>
            <button
              onClick={() => setVoiceState('listening')}
              className={`px-3 py-1 rounded-lg transition-all ${
                voiceState === 'listening' ? 'bg-[#9026c3] text-white font-bold shadow-sm' : 'text-[#464554] hover:bg-white/60'
              }`}
            >
              Listening
            </button>
            <button
              onClick={() => setVoiceState('idle')}
              className={`px-3 py-1 rounded-lg transition-all ${
                voiceState === 'idle' ? 'bg-[#1a1c1c] text-white font-bold shadow-sm' : 'text-[#464554] hover:bg-white/60'
              }`}
            >
              Idle
            </button>
          </div>
        </div>

        {/* Animated Conversation Showcase */}
        <div className="bg-[#f9f9f9] rounded-2xl p-4 border border-[#c7c4d7]/40 space-y-2.5 mb-5 min-h-[120px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {stepIndex === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="space-y-1"
              >
                <span className="text-[10px] font-bold text-[#777586] uppercase tracking-wider block">
                  Caller Question
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#1a1c1c] italic">
                  "When is the last date to submit the semester registration fee?"
                </p>
              </motion.div>
            )}

            {stepIndex === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="space-y-1"
              >
                <span className="text-[10px] font-bold text-[#4441cc] uppercase tracking-wider block flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">volume_up</span>
                  Campus AI Voice Answer
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#1a1c1c]">
                  "According to the latest ADTU notice, the registration deadline is September 10."
                </p>
              </motion.div>
            )}

            {stepIndex === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[10px] font-bold rounded border border-emerald-500/20 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Source-backed
                  </span>
                  <span className="px-2 py-0.5 bg-[#4441cc]/10 text-[#4441cc] text-[10px] font-bold rounded border border-[#4441cc]/20">
                    Official ADTU Notice
                  </span>
                </div>
                <p className="text-xs text-[#464554] font-medium">
                  Verified in <span className="font-semibold text-[#1a1c1c]">Notice_Reg_2026_089_Verification.pdf</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            onClick={onCallClick}
            className="w-full py-3.5 rounded-full bg-[#4441cc] hover:bg-[#3835be] text-white text-xs sm:text-sm font-bold shadow-lg hover:shadow-[0_0_25px_rgba(68,65,204,0.35)] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">phone_callback</span>
            <span>Call Campus AI Now</span>
          </button>
        </div>

      </div>
    </div>
  );
}
