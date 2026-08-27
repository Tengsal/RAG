'use client';

import React from 'react';

export function WhyVoiceSection() {
  const BENEFITS = [
    {
      icon: 'mic_none',
      title: 'No Typing Required',
      description: 'Speak directly from your mobile phone or browser without navigating complex portals.',
    },
    {
      icon: 'question_answer',
      title: 'Ask Follow-up Questions',
      description: 'Clarify admission rules, fee payment steps, or exam schedules in natural spoken conversation.',
    },
    {
      icon: 'verified_user',
      title: 'Grounded in Official Sources',
      description: 'Every spoken answer is backed by official ADTU registrar circulars and academic ordinances.',
    },
    {
      icon: 'shield',
      title: 'Honest Abstention',
      description: 'If a policy isn\'t in official records, Campus AI refrains from guessing and directs you to office staff.',
    },
  ];

  return (
    <section className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-32">
      <div className="glass-card rounded-[32px] p-8 sm:p-12 border border-white/60 shadow-lg relative overflow-hidden">
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border-[#c7c4d7]/30 text-xs font-semibold text-[#4441cc] mb-3">
            <span className="material-symbols-outlined text-[16px]">call</span>
            <span>WHY VOICE CALLING?</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#1a1c1c] tracking-tight mb-3">
            Need an answer quickly? Just call.
          </h2>
          <p className="text-sm sm:text-base text-[#464554] leading-relaxed">
            ADTU Campus Voice AI gives students, parents, and faculty direct phone access to verified university information.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((item, idx) => (
            <div
              key={idx}
              className="bg-white/70 p-6 rounded-2xl border border-[#c7c4d7]/30 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </div>
              <h3 className="text-base font-bold text-[#1a1c1c] mb-2">{item.title}</h3>
              <p className="text-xs text-[#464554] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
