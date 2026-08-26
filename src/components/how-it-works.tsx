'use client';

import React from 'react';
import { StepItem, HOW_IT_WORKS_STEPS } from '@/lib/campus-data';

export type { StepItem };

interface HowItWorksProps {
  id?: string;
  className?: string;
  title?: string;
  subtitle?: string;
  steps?: StepItem[];
}

export function HowItWorks({
  id = 'how-it-works',
  className = 'px-6 sm:px-20 max-w-[1440px] mx-auto mb-40 text-center',
  title = 'How It Works',
  subtitle = 'Our uncertainty-aware RAG pipeline validates evidence and estimates confidence before answering.',
  steps = HOW_IT_WORKS_STEPS,
}: HowItWorksProps) {
  return (
    <section id={id} className={className}>
      <h2 className="text-3xl sm:text-5xl font-bold text-[#1a1c1c] mb-4 tracking-tight">
        {title}
      </h2>
      <p className="text-base text-[#464554] max-w-2xl mx-auto mb-16 font-normal">
        {subtitle}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
        {/* Horizontal Connector Line */}
        <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[#4441cc]/20 via-[#4441cc] to-[#4441cc]/20 -z-10" />

        {steps.map((item) => (
          <div
            key={item.step}
            className={`flex flex-col items-center glass-card p-6 rounded-3xl ${item.hoverBorderClass} transition-all shadow-sm`}
          >
            <div
              className={`w-16 h-16 rounded-2xl ${item.bgClass} flex items-center justify-center mb-4 shadow-inner`}
              style={{ color: item.colorHex }}
            >
              <span className="material-symbols-outlined text-3xl">{item.icon}</span>
            </div>
            <span
              className="text-[10px] font-bold tracking-widest uppercase mb-1"
              style={{ color: item.colorHex }}
            >
              Step {item.step}
            </span>
            <h4 className="text-base font-bold text-[#1a1c1c] mb-2">{item.title}</h4>
            <p className="text-xs font-medium text-[#464554] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;
