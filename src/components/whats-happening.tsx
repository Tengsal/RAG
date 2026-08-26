'use client';

import React, { useState } from 'react';
import { CampusEvent, CAMPUS_EVENTS, EVENT_CATEGORIES } from '@/lib/campus-data';

export type { CampusEvent };

export function WhatsHappening() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalEvent, setActiveModalEvent] = useState<CampusEvent | null>(null);

  const filteredEvents = CAMPUS_EVENTS.filter((event) => {
    if (selectedCategory === 'All') return true;
    return event.category === selectedCategory;
  });

  const getCategoryBadgeClass = (category: CampusEvent['category']) => {
    switch (category) {
      case 'Important':
        return 'bg-red-500/10 text-red-700 border-red-500/30';
      case 'Event':
        return 'bg-[#4441cc]/10 text-[#4441cc] border-[#4441cc]/30';
      case 'Notice':
        return 'bg-[#9026c3]/10 text-[#9026c3] border-[#9026c3]/30';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/30';
    }
  };

  return (
    <section id="campus-updates" className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-36">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border-[#c7c4d7]/30 text-xs font-semibold text-[#4441cc] mb-3">
            <span className="material-symbols-outlined text-[16px]">campaign</span>
            <span>CAMPUS PULSE & NOTICES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-[#1a1c1c] tracking-tight">
            What’s Happening at AdtU
          </h2>
          <p className="text-base text-[#464554] max-w-xl mt-3 leading-relaxed">
            Essential orientation schedules, verification deadlines, cultural events, and notices for new students.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl glass-card border-white/40">
          {EVENT_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#4441cc] text-white shadow-md shadow-[#4441cc]/20'
                    : 'text-[#464554] hover:text-[#1a1c1c] hover:bg-white/60'
                }`}
              >
                {cat === 'All' ? 'All Updates' : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className={`flex flex-col justify-between p-7 rounded-3xl transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1.5 ${
              event.isPriority
                ? 'animated-gradient-border p-[1px]'
                : 'glass-card hover:border-[#4441cc]/40'
            }`}
          >
            <div className="glass-card p-6 rounded-3xl h-full flex flex-col justify-between bg-white/40">
              <div>
                {/* Category & Audience Badges */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getCategoryBadgeClass(
                      event.category
                    )}`}
                  >
                    {event.category === 'Important' && (
                      <span className="material-symbols-outlined text-[14px] align-middle mr-1">
                        priority_high
                      </span>
                    )}
                    {event.category}
                  </span>

                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0055a9]/10 text-[#0055a9] border border-[#0055a9]/20">
                    {event.audience}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-[#1a1c1c] mb-3 leading-snug group-hover:text-[#4441cc] transition-colors">
                  {event.title}
                </h3>

                {/* Date, Time & Venue */}
                <div className="space-y-1.5 mb-4 text-xs font-semibold text-[#464554]">
                  <div className="flex items-center gap-2 text-[#4441cc]">
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    <span>{event.date} • {event.time}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#9026c3]">location_on</span>
                      <span className="truncate">{event.venue}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-[#464554] leading-relaxed mb-6 font-normal">
                  {event.description}
                </p>
              </div>

              {/* View Details Action */}
              <button
                onClick={() => setActiveModalEvent(event)}
                className="w-full py-2.5 px-4 rounded-2xl glass-card text-xs font-bold text-[#1a1c1c] hover:bg-[#4441cc] hover:text-white transition-all flex items-center justify-center gap-2 group shadow-inner"
              >
                <span>View Details</span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col p-8 rounded-3xl border border-white/40 bg-[#f9f9f9]/95 shadow-2xl space-y-6 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/20">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                      activeModalEvent.category
                    )}`}
                  >
                    {activeModalEvent.category}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#0055a9]/10 text-[#0055a9]">
                    {activeModalEvent.audience}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-[#1a1c1c] tracking-tight">
                  {activeModalEvent.title}
                </h3>
              </div>

              <button
                onClick={() => setActiveModalEvent(null)}
                className="text-[#464554] hover:text-[#1a1c1c] p-1.5 rounded-xl hover:bg-black/5"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 text-sm text-[#1a1c1c]">
              {/* Date & Venue Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/70 border border-white/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center">
                    <span className="material-symbols-outlined">event</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#777586] uppercase block">Date & Time</span>
                    <span className="text-xs font-bold text-[#1a1c1c]">{activeModalEvent.date}</span>
                    <p className="text-[11px] text-[#464554]">{activeModalEvent.time}</p>
                  </div>
                </div>

                {activeModalEvent.venue && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#9026c3]/10 text-[#9026c3] flex items-center justify-center">
                      <span className="material-symbols-outlined">pin_drop</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#777586] uppercase block">Location</span>
                      <span className="text-xs font-bold text-[#1a1c1c]">{activeModalEvent.venue}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Overview */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#777586] mb-1">
                  Event Overview
                </h4>
                <p className="text-xs text-[#464554] leading-relaxed">
                  {activeModalEvent.fullDetails.overview}
                </p>
              </div>

              {/* Key Highlights / Agenda */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#777586] mb-2">
                  Program Highlights & Agenda
                </h4>
                <ul className="space-y-2">
                  {activeModalEvent.fullDetails.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-[#1a1c1c]">
                      <span className="material-symbols-outlined text-[16px] text-[#4441cc] shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Note / Instructions */}
              {activeModalEvent.fullDetails.actionNote && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 font-semibold flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-base text-amber-600 shrink-0 mt-0.5">
                    info
                  </span>
                  <span>{activeModalEvent.fullDetails.actionNote}</span>
                </div>
              )}

              {/* Contact Information */}
              {activeModalEvent.fullDetails.contactPerson && (
                <div className="text-xs text-[#464554] pt-2 border-t border-white/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[#4441cc]">support_agent</span>
                  <span>Contact: {activeModalEvent.fullDetails.contactPerson}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/20 flex items-center justify-between">
              <span className="text-[11px] text-[#777586]">Assam Down Town University • Official Student Notice</span>
              <button
                onClick={() => setActiveModalEvent(null)}
                className="px-6 py-2 rounded-full bg-[#4441cc] text-white text-xs font-semibold hover:bg-[#4441cc]/90 transition-all shadow-md"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default WhatsHappening;
