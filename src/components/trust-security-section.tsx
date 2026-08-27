'use client';

import React from 'react';

export function TrustSecuritySection() {
  const TRUST_ITEMS = [
    {
      icon: 'verified_user',
      title: 'Official ADTU Repositories',
      description: 'Grounded strictly in verified Assam Down Town University academic regulations, syllabi, fee circulars, and official registrar notices.',
      badge: 'OFFICIAL DATA',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    },
    {
      icon: 'shield_lock',
      title: 'Zero-Hallucination Guarantee',
      description: 'Prevents false policies or fabricated answers. If an answer cannot be verified from official university files, the system explicitly says "I don\'t know."',
      badge: 'GROUNDED RAG',
      badgeColor: 'bg-[#4441cc]/10 text-[#4441cc] border-[#4441cc]/20',
    },
    {
      icon: 'query_stats',
      title: 'Transparent Confidence Metrics',
      description: 'Every answer displays a real-time confidence percentage and direct document citations so students and faculty can double-check source clauses.',
      badge: 'VERIFIED CITATIONS',
      badgeColor: 'bg-[#9026c3]/10 text-[#9026c3] border-[#9026c3]/20',
    },
    {
      icon: 'lock',
      title: 'Student Privacy & Security',
      description: 'Built with enterprise-grade data protection, role-based access controls for admins/students, and zero sharing of personal queries with third parties.',
      badge: 'SECURE & ENCRYPTED',
      badgeColor: 'bg-[#0055a9]/10 text-[#0055a9] border-[#0055a9]/20',
    },
  ];

  return (
    <section id="reliability" className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-36">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border-[#c7c4d7]/30 text-xs font-semibold text-[#4441cc] mb-4 shimmer">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>BUILT FOR ACCURACY & TRUST</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold text-[#1a1c1c] tracking-tight mb-4">
          Why ADTU Knowledge Base AI is Reliable
        </h2>
        <p className="text-base sm:text-lg text-[#464554] leading-relaxed font-normal">
          Designed specifically for university academic operations where incorrect answers cause real student friction. Here is how we enforce strict accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TRUST_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="glass-card p-7 rounded-3xl border border-white/50 shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4441cc] to-[#9026c3] flex items-center justify-center text-white shadow-md">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1c] mb-3">{item.title}</h3>
              <p className="text-xs text-[#464554] leading-relaxed font-medium">
                {item.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#c7c4d7]/20 flex items-center gap-2 text-[11px] font-bold text-[#4441cc]">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>100% Grounded Standard</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
