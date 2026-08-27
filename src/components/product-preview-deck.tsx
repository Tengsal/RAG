'use client';

import React, { useState } from 'react';
import { DEMO_SCENARIOS, DemoScenario } from '@/lib/landing-data';

export function ProductPreviewDeck() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('verified-regulation');
  const [userFeedback, setUserFeedback] = useState<Record<string, 'up' | 'down' | null>>({});

  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  const handleFeedback = (scenarioId: string, rating: 'up' | 'down') => {
    setUserFeedback((prev) => ({
      ...prev,
      [scenarioId]: prev[scenarioId] === rating ? null : rating,
    }));
  };

  return (
    <div id="product-demo" className="w-full max-w-5xl mx-auto">
      {/* Container with Animated Gradient Border */}
      <div className="animated-gradient-border p-[1px] shadow-2xl">
        <div className="glass-card rounded-[28px] bg-white/80 backdrop-blur-2xl p-4 sm:p-8 overflow-hidden">
          
          {/* Top Bar & Scenario Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#c7c4d7]/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-md">
                <span className="material-symbols-outlined text-xl">psychology</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1a1c1c] tracking-tight">
                  ADTU Knowledge Base AI Interface
                </h3>
                <p className="text-xs text-[#464554] opacity-80 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Grounded RAG Engine • Assam Down Town University
                </p>
              </div>
            </div>

            {/* Scenario Selector Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#eeeeee]/80 rounded-2xl overflow-x-auto max-w-full">
              {DEMO_SCENARIOS.map((scenario) => {
                const isActive = scenario.id === activeScenarioId;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setActiveScenarioId(scenario.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-[#4441cc] shadow-md font-bold'
                        : 'text-[#464554] hover:text-[#1a1c1c] hover:bg-white/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{scenario.icon}</span>
                    <span>{scenario.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Interface Display */}
          <div className="pt-6 space-y-6">
            
            {/* User Question Bubble */}
            <div className="flex items-start gap-3 max-w-[90%] sm:max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-[#e8e8e8] shrink-0 flex items-center justify-center text-[#464554] font-bold text-xs shadow-sm">
                <span className="material-symbols-outlined text-base">person</span>
              </div>
              <div className="bg-[#f3f3f4] p-4 rounded-2xl rounded-tl-none text-sm text-[#1a1c1c] font-medium leading-relaxed shadow-sm">
                <span className="text-[10px] font-bold text-[#777586] block uppercase tracking-wider mb-1">Student / Faculty Question</span>
                {activeScenario.question}
              </div>
            </div>

            {/* AI Answer Bubble */}
            <div className="flex items-start gap-3 max-w-[98%] sm:max-w-[92%] ml-auto flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-[#4441cc] shrink-0 flex items-center justify-center text-white shadow-md">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
              </div>

              <div className={`w-full p-5 sm:p-6 rounded-2xl rounded-tr-none text-sm border shadow-sm transition-all duration-300 ${
                activeScenario.badgeType === 'uncertain'
                  ? 'bg-amber-50/60 border-amber-200/80 text-[#1a1c1c]'
                  : 'bg-white/90 border-[#4441cc]/20 text-[#1a1c1c]'
              }`}>
                {/* Verification Metadata Badges Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#c7c4d7]/30">
                  <div className="flex items-center gap-2">
                    {activeScenario.badgeType === 'verified' && (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-bold rounded-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        {activeScenario.verificationStatus}
                      </span>
                    )}
                    {activeScenario.badgeType === 'notice' && (
                      <span className="px-2.5 py-1 bg-[#4441cc]/10 text-[#4441cc] border border-[#4441cc]/20 text-[11px] font-bold rounded-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">campaign</span>
                        {activeScenario.verificationStatus}
                      </span>
                    )}
                    {activeScenario.badgeType === 'uncertain' && (
                      <span className="px-2.5 py-1 bg-amber-500/15 text-amber-800 border border-amber-500/30 text-[11px] font-bold rounded-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        {activeScenario.verificationStatus}
                      </span>
                    )}

                    <span className="text-[11px] font-bold text-[#464554] opacity-75">
                      Confidence: {activeScenario.confidenceScore}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-[#777586]">
                    ADTU Knowledge Base RAG v2.4
                  </span>
                </div>

                {/* Main Answer Content */}
                <p className="leading-relaxed text-sm text-[#1a1c1c] font-normal mb-4">
                  {activeScenario.answerText}
                </p>

                {/* Explanation note for Uncertainty Case */}
                {activeScenario.explanationNote && (
                  <div className="p-3 bg-amber-100/50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-4 flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-amber-700 shrink-0">info</span>
                    <div>
                      <span className="font-bold block">Why didn't the AI answer?</span>
                      {activeScenario.explanationNote}
                    </div>
                  </div>
                )}

                {/* Recommended Fallback Action */}
                {activeScenario.fallbackAction && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-[#1a1c1c] font-medium flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-base text-[#4441cc]">support_agent</span>
                    <span>{activeScenario.fallbackAction}</span>
                  </div>
                )}

                {/* Citations & Source Links */}
                {activeScenario.citations.length > 0 && (
                  <div className="pt-3 border-t border-[#c7c4d7]/30">
                    <span className="text-[11px] font-bold text-[#4441cc] uppercase tracking-wider block mb-2">
                      Verified Document Citations
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeScenario.citations.map((cite, idx) => (
                        <a
                          key={idx}
                          href="/documents"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f3f4] hover:bg-[#4441cc]/10 hover:text-[#4441cc] border border-[#c7c4d7]/40 rounded-xl text-xs font-semibold transition-all"
                        >
                          <span className="material-symbols-outlined text-sm text-[#4441cc]">{cite.icon}</span>
                          <span>{cite.name}</span>
                          <span className="material-symbols-outlined text-xs opacity-60">open_in_new</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Feedback Bar */}
                <div className="mt-4 pt-3 border-t border-[#c7c4d7]/30 flex items-center justify-between text-xs text-[#777586]">
                  <span className="font-medium">Was this source-backed answer accurate?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFeedback(activeScenario.id, 'up')}
                      className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                        userFeedback[activeScenario.id] === 'up'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-bold'
                          : 'hover:bg-[#eeeeee] border-transparent text-[#464554]'
                      }`}
                      title="Mark as helpful"
                    >
                      <span className="material-symbols-outlined text-base">thumb_up</span>
                      <span>Yes</span>
                    </button>

                    <button
                      onClick={() => handleFeedback(activeScenario.id, 'down')}
                      className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                        userFeedback[activeScenario.id] === 'down'
                          ? 'bg-red-500/10 text-red-700 border-red-500/30 font-bold'
                          : 'hover:bg-[#eeeeee] border-transparent text-[#464554]'
                      }`}
                      title="Report inaccuracy"
                    >
                      <span className="material-symbols-outlined text-base">thumb_down</span>
                      <span>No</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
