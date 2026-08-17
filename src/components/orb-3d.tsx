'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Orb3DProps {
  state?: OrbState;
  onVoiceSubmit?: (text: string) => void;
  size?: number;
  className?: string;
  showControls?: boolean;
}

export function Orb3D({
  state = 'idle',
  onVoiceSubmit,
  size = 240,
  className = '',
}: Orb3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbState, setOrbState] = useState<OrbState>(state);

  useEffect(() => {
    setOrbState(state);
  }, [state]);

  // Exact Siri Pearl Glass Orb Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const render = () => {
      t += 0.012;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = width * 0.36;

      ctx.clearRect(0, 0, width, height);

      let speed = 1;
      let waveScale = 1;

      if (orbState === 'listening') {
        speed = 2.2;
        waveScale = 1.3;
      } else if (orbState === 'thinking') {
        speed = 2.8;
        waveScale = 1.1;
      } else if (orbState === 'speaking') {
        speed = 1.8;
        waveScale = 1.25;
      }

      // 1. Soft Ambient Outer Glow
      const ambientGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.5,
        centerX,
        centerY,
        radius * 1.35
      );
      ambientGlow.addColorStop(0, 'rgba(192, 180, 255, 0.25)');
      ambientGlow.addColorStop(0.6, 'rgba(147, 130, 255, 0.12)');
      ambientGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Pearl Glass Sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip(); // Clip inner fluid wave strictly inside the sphere boundary

      // Pearl Base Fill
      const pearlBase = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      pearlBase.addColorStop(0, '#FFFFFF');
      pearlBase.addColorStop(0.35, '#F5F3FF');
      pearlBase.addColorStop(0.75, '#EDE9FE');
      pearlBase.addColorStop(1, '#DDD6FE');

      ctx.fillStyle = pearlBase;
      ctx.fill();

      // 3. Inner Dynamic Fluid S-Curve Wave (Exact Match to Siri Image)
      const wavePoints = 100;
      const waveLayers = 3;

      for (let l = 0; l < waveLayers; l++) {
        ctx.save();
        ctx.beginPath();

        const lOffset = l * 0.8;
        const lTime = t * speed + lOffset;

        // Draw flowing organic S-curve blob
        for (let i = 0; i <= wavePoints; i++) {
          const progress = i / wavePoints;
          const angle = progress * Math.PI * 2;

          // S-Curve Fluid Math: Combines double frequencies for the smooth ribbon wave
          const waveR =
            radius * (0.65 + 0.18 * Math.sin(angle * 2 + lTime) * waveScale) +
            Math.cos(angle * 3 - lTime * 0.8) * (radius * 0.12 * waveScale);

          const x = centerX + Math.cos(angle) * waveR;
          const y = centerY + Math.sin(angle) * waveR;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();

        // Fluid S-Curve Gradient Colors (Cobalt Blue -> Royal Purple -> Rose Magenta)
        const waveGrad = ctx.createLinearGradient(
          centerX - radius * Math.cos(lTime * 0.5),
          centerY - radius * Math.sin(lTime * 0.5),
          centerX + radius * Math.cos(lTime * 0.5),
          centerY + radius * Math.sin(lTime * 0.5)
        );

        if (l === 0) {
          waveGrad.addColorStop(0, 'rgba(59, 130, 246, 0.95)'); // Electric Cobalt Blue
          waveGrad.addColorStop(0.45, 'rgba(139, 92, 246, 0.9)'); // Royal Purple
          waveGrad.addColorStop(0.85, 'rgba(236, 72, 153, 0.85)'); // Magenta Rose
          waveGrad.addColorStop(1, 'rgba(244, 114, 182, 0.6)');
        } else if (l === 1) {
          waveGrad.addColorStop(0, 'rgba(99, 102, 241, 0.85)');
          waveGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.85)');
          waveGrad.addColorStop(1, 'rgba(217, 70, 239, 0.7)');
        } else {
          waveGrad.addColorStop(0, 'rgba(37, 99, 235, 0.75)');
          waveGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.8)');
          waveGrad.addColorStop(1, 'rgba(236, 72, 153, 0.5)');
        }

        ctx.fillStyle = waveGrad;
        ctx.globalCompositeOperation = 'multiply';
        ctx.filter = 'blur(6px)';
        ctx.fill();
        ctx.restore();
      }

      // Soft Inner Shadow Rim to give true 3D Glass Depth
      const innerShadow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.7,
        centerX,
        centerY,
        radius
      );
      innerShadow.addColorStop(0, 'rgba(255, 255, 255, 0)');
      innerShadow.addColorStop(0.8, 'rgba(200, 190, 245, 0.15)');
      innerShadow.addColorStop(1, 'rgba(160, 140, 230, 0.4)');

      ctx.fillStyle = innerShadow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Glass Specular Lens Reflection (Top-Left Crescent Highlight)
      const glassHighlight = ctx.createRadialGradient(
        centerX - radius * 0.4,
        centerY - radius * 0.45,
        radius * 0.05,
        centerX - radius * 0.4,
        centerY - radius * 0.45,
        radius * 0.6
      );
      glassHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      glassHighlight.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
      glassHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = glassHighlight;
      ctx.beginPath();
      ctx.arc(centerX - radius * 0.4, centerY - radius * 0.45, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Specular Reflection Curve
      const bottomReflection = ctx.createRadialGradient(
        centerX + radius * 0.2,
        centerY + radius * 0.45,
        radius * 0.1,
        centerX + radius * 0.2,
        centerY + radius * 0.45,
        radius * 0.5
      );
      bottomReflection.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      bottomReflection.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      bottomReflection.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = bottomReflection;
      ctx.beginPath();
      ctx.arc(centerX + radius * 0.2, centerY + radius * 0.45, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Restore outer canvas clipping state

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [orbState]);

  const toggleVoiceMode = () => {
    if (orbState === 'idle') {
      setOrbState('listening');
      setTimeout(() => {
        setOrbState('thinking');
        setTimeout(() => {
          setOrbState('speaking');
          onVoiceSubmit?.('What are the admission requirements for Computer Science?');
          setTimeout(() => setOrbState('idle'), 3000);
        }, 2000);
      }, 2500);
    } else {
      setOrbState('idle');
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center relative ${className}`}>
      {/* Siri Pearl Glass Orb Canvas */}
      <div className="relative group cursor-pointer" onClick={toggleVoiceMode}>
        <canvas
          ref={canvasRef}
          width={size * 1.5}
          height={size * 1.5}
          className="transition-transform duration-500 group-hover:scale-105"
          style={{ width: `${size}px`, height: `${size}px` }}
        />

        {/* Outer Aura Ring when listening */}
        <AnimatePresence>
          {orbState === 'listening' && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0.6 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-indigo-400/40 pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
