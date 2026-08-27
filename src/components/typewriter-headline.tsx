'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface TypewriterPhrase {
  prefix: string;
  accent: string;
}

const DEFAULT_PHRASES: TypewriterPhrase[] = [
  { prefix: 'Instant Answers ', accent: 'for ADTU' },
  { prefix: 'Trusted Information, ', accent: 'Instantly' },
  { prefix: 'Your Campus, ', accent: 'One Conversation Away' },
];

export function TypewriterHeadline() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = DEFAULT_PHRASES[phraseIndex];
    const fullText = `${currentPhrase.prefix}${currentPhrase.accent}`;

    let timer: NodeJS.Timeout;

    if (!isDeleting && charIndex < fullText.length) {
      // Typing speed (approx 55ms per char)
      timer = setTimeout(() => {
        setCharIndex((prev) => prev + 1);
      }, 55);
    } else if (!isDeleting && charIndex === fullText.length) {
      // Pause at full phrase before deleting (2.2 seconds)
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2200);
    } else if (isDeleting && charIndex > 0) {
      // Deleting speed (approx 32ms per char)
      timer = setTimeout(() => {
        setCharIndex((prev) => prev - 1);
      }, 32);
    } else if (isDeleting && charIndex === 0) {
      // Move to next phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % DEFAULT_PHRASES.length);
    }

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phraseIndex]);

  const currentPhrase = DEFAULT_PHRASES[phraseIndex];
  const prefixLength = currentPhrase.prefix.length;

  // Split typed substring into prefix portion & accent portion
  const visiblePrefix = currentPhrase.prefix.slice(0, Math.min(charIndex, prefixLength));
  const visibleAccent =
    charIndex > prefixLength
      ? currentPhrase.accent.slice(0, charIndex - prefixLength)
      : '';

  return (
    <div className="min-h-[120px] sm:min-h-[150px] lg:min-h-[165px] flex items-center justify-center mb-6">
      <h1
        id="hero-title"
        className="text-4xl sm:text-6xl lg:text-[66px] font-bold text-[#1a1c1c] tracking-tight leading-[1.15] max-w-4xl mx-auto text-center font-['Geist'] inline-block"
      >
        <span>{visiblePrefix}</span>
        {visibleAccent && (
          <span className="bg-gradient-to-r from-[#4441cc] to-[#9026c3] bg-clip-text text-transparent">
            {visibleAccent}
          </span>
        )}

        {/* Animated Pulsing Caret Cursor */}
        <motion.span
          className="inline-block w-[3px] sm:w-[4px] h-[36px] sm:h-[54px] lg:h-[60px] bg-[#4441cc] ml-1.5 align-middle rounded-full"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </h1>
    </div>
  );
}
