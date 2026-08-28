'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HowItWorks } from '@/components/how-it-works';
import { WhatsHappening } from '@/components/whats-happening';
import { ProductPreviewDeck } from '@/components/product-preview-deck';
import { TrustSecuritySection } from '@/components/trust-security-section';
import { WhyVoiceSection } from '@/components/why-voice-section';
import { TypewriterHeadline } from '@/components/typewriter-headline';
import { HERO_DATA, NAV_ITEMS, FEATURE_ITEMS } from '@/lib/landing-data';
import { useAuth } from '@/context/auth-context';
import { CallingAgentModal } from '@/components/calling-agent-modal';
import { motion, AnimatePresence } from 'framer-motion';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isCallingModalOpen, setIsCallingModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeNav, setActiveNav] = useState('#hero');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const handleTryAssistant = () => {
    // TEMPORARY AUTH BYPASS (dev only): "Ask Campus AI" goes straight to the
    // chat, skipping the login redirect. REVERT before deploying.
    router.push('/chat');
    // if (!isAuthenticated) {
    //   router.push('/login?redirect=/chat');
    // } else if (user?.role === 'admin') {
    //   router.push('/admin');
    // } else {
    //   router.push('/chat');
    // }
  };

  // WebGL Shader Animation initialization from code.html
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const fs = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    float t = u_time * 0.2;
    
    vec3 color1 = vec3(0.27, 0.25, 0.80); // Electric Blue #4441cc
    vec3 color2 = vec3(0.56, 0.15, 0.76); // Royal Purple #9026c3
    vec3 color3 = vec3(0.00, 0.33, 0.66); // Emerald/Cyan #0055a9
    
    float n1 = sin(uv.x * 3.0 + t) * cos(uv.y * 2.0 - t * 0.5);
    float n2 = sin(uv.y * 4.0 - t * 0.8) * cos(uv.x * 2.5 + t * 0.3);
    
    vec3 finalColor = mix(color1, color2, n1 * 0.5 + 0.5);
    finalColor = mix(finalColor, color3, n2 * 0.5 + 0.5);
    
    finalColor = mix(vec3(0.98, 0.98, 1.0), finalColor, 0.15);
    gl_FragColor = vec4(finalColor, 1.0);
}`;

    function compileShader(type: number, src: string) {
      const shader = gl!.createShader(type)!;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      return shader;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    let animationFrameId: number;
    function render(t: number) {
      syncSize();
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) gl!.uniform1f(uTime, t * 0.001);
      if (uRes) gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeObserver && canvas) resizeObserver.unobserve(canvas);
    };
  }, []);

  // Scroll listener for header shadow & height transformation
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      setIsScrolled(scrolled > 20);

      const heroTitle = document.getElementById('hero-title');
      if (heroTitle) {
        heroTitle.style.setProperty('--tw-parallax-y', `${scrolled * 0.15}px`);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(chatInput)}`);
  };

  return (
    <div className="bg-[#f9f9f9] text-[#1a1c1c] font-sans overflow-x-hidden min-h-screen">
      {/* Global Background Shader Canvas */}
      <div className="fixed inset-0 w-full h-full -z-10 opacity-40 pointer-events-none">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* TopNavBar with Dynamic Scroll Transformation */}
      <header className={`fixed top-0 w-full z-[100] transition-all duration-300 ${
        isScrolled
          ? 'bg-white/85 backdrop-blur-2xl py-3 border-b border-[#c7c4d7]/40 shadow-md shadow-[#4441cc]/5'
          : 'bg-[#f9f9f9]/40 backdrop-blur-2xl py-4 border-b border-white/20 shadow-[0_8px_32px_0_rgba(68,65,204,0.05)]'
      }`}>
        <nav className="flex justify-between items-center px-6 sm:px-20 max-w-[1440px] mx-auto">
          <Link href="/" className="text-2xl sm:text-3xl font-bold text-[#4441cc] tracking-tighter font-['Geist']">
            ADTU Campus AI
          </Link>

          {/* Navigation Items with Framer Motion Active Indicator */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.href;
              return item.isExternal ? (
                <Link
                  key={item.label}
                  className="text-[#464554] hover:text-[#4441cc] transition-colors py-1 relative"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  onClick={() => setActiveNav(item.href)}
                  className={`transition-colors py-1 relative ${
                    isActive ? 'text-[#4441cc] font-semibold' : 'text-[#464554] hover:text-[#4441cc]'
                  }`}
                  href={item.href}
                >
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#4441cc] rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Single Main Navbar CTA: Call Campus AI */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsCallingModalOpen(true)}
              className="px-5 py-2.5 rounded-full bg-[#4441cc] hover:bg-[#3835be] text-white font-bold shadow-md hover:shadow-[0_0_20px_rgba(68,65,204,0.35)] transition-all flex items-center gap-2 text-xs sm:text-sm group"
              title="Call ADTU Campus AI"
              aria-label="Call ADTU Campus AI"
            >
              <span className="material-symbols-outlined text-base group-hover:scale-110 transition-transform">phone_in_talk</span>
              <span>Call Campus AI</span>
            </motion.button>

            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="text-xs sm:text-sm font-semibold text-[#464554] hover:text-[#4441cc] transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-xs sm:text-sm font-semibold text-[#4441cc] hover:underline"
                >
                  Register
                </Link>
              </>
            ) : (
              /* Compact User Profile Menu (Far Right Corner) */
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#c7c4d7]/40 shadow-sm text-xs font-semibold text-[#1a1c1c] hover:bg-white transition-all"
                >
                  <div className="w-5 h-5 rounded-full bg-[#4441cc] text-white font-bold text-[10px] flex items-center justify-center">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="truncate max-w-[90px]">{user?.name}</span>
                  <span className="material-symbols-outlined text-sm text-[#777586]">expand_more</span>
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-44 bg-white/95 backdrop-blur-xl rounded-2xl p-2 border border-[#c7c4d7]/40 shadow-xl z-50 space-y-1 text-xs"
                    >
                      <div className="px-3 py-2 border-b border-[#c7c4d7]/30 font-semibold text-[#1a1c1c] truncate">
                        {user?.name}
                      </div>
                      {user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="block px-3 py-2 rounded-xl hover:bg-[#eeeeee] font-semibold text-[#9026c3]"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 font-semibold flex items-center justify-between transition-colors"
                      >
                        <span>Sign Out</span>
                        <span className="material-symbols-outlined text-sm">logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative pt-32 pb-24 overflow-hidden">
        {/* Hero Section — Clean Minimalist Layout */}
        <section id="hero" className="px-6 sm:px-20 max-w-5xl mx-auto text-center mb-24 relative pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border-[#c7c4d7]/30 text-xs font-semibold text-[#4441cc] mb-6 shimmer">
            <span className="material-symbols-outlined text-[16px]">
              {HERO_DATA.badgeIcon}
            </span>
            <span>{HERO_DATA.badgeText}</span>
          </div>

          {/* Framer Motion Typewriter Animated Headline */}
          <TypewriterHeadline />

          <p className="text-base sm:text-xl text-[#464554] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            {HERO_DATA.subheading}
          </p>

          {/* Single Hero CTA: Ask Campus AI */}
          <div className="flex items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleTryAssistant}
              className="w-full sm:w-auto px-10 py-4 sm:py-4.5 rounded-full bg-[#4441cc] hover:bg-[#3835be] text-white font-bold text-base sm:text-lg hover:shadow-[0_0_40px_rgba(68,65,204,0.4)] transition-all shadow-xl flex items-center justify-center gap-2.5 group"
            >
              <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">forum</span>
              <span>{HERO_DATA.ctaPrimary}</span>
            </motion.button>
          </div>

          {/* Abstract Floating Glow Orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#4441cc]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-40 -right-20 w-80 h-80 bg-[#9026c3]/10 rounded-full blur-[120px] pointer-events-none" />
        </section>

        {/* Concise "Why Voice?" Section */}
        <WhyVoiceSection />

        {/* Secondary Product Demo Section (RAG Proof of Accuracy) */}
        <section id="product-demo" className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-36">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full glass-card border-[#c7c4d7]/30 text-xs font-semibold text-[#4441cc] mb-3">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              <span>SECONDARY PROOF OF INTELLIGENCE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1c1c] tracking-tight mb-3">
              How Answers Are Grounded in ADTU Documents
            </h2>
            <p className="text-base text-[#464554] leading-relaxed">
              Explore how our underlying RAG system validates evidence, cites official sources, and refrains from guessing when information is unavailable.
            </p>
          </div>

          <ProductPreviewDeck />
        </section>

        {/* Trust, Security & Reliability Section */}
        <TrustSecuritySection />

        {/* Campus Pulse & Student Notices ("What's Happening at AdtU") */}
        <WhatsHappening />

        {/* Adaptive Workflow Section ("How It Works / The Uncertainty-Aware RAG Pipeline") */}
        <HowItWorks />

        {/* Features Grid */}
        <section className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURE_ITEMS.map((item) => (
              <div key={item.id} className="glass-card p-10 rounded-3xl hover:-translate-y-2 transition-all duration-300 shadow-md">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-8 shadow-lg`}>
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-[#1a1c1c] mb-4">{item.title}</h3>
                <p className="text-sm text-[#464554] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Charts Dashboard ("Benchmarking Reliability") */}
        <section id="performance" className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-40">
          <div className="glass-card rounded-[40px] p-8 sm:p-12 overflow-hidden relative shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[200px]">monitoring</span>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <h2 className="text-3xl sm:text-5xl font-bold text-[#1a1c1c] mb-6 tracking-tight">
                  Benchmarking Reliability
                </h2>
                <p className="text-base sm:text-lg text-[#464554] mb-10 leading-relaxed font-normal">
                  ADTU KB AI outperforms standard RAG pipelines by identifying data gaps before they reach the generative stage.
                </p>

                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-[#1a1c1c]">Retrieval Precision</span>
                      <span className="text-[#4441cc] font-bold text-lg">99.2%</span>
                    </div>
                    <div className="h-3 w-full bg-[#eeeeee] rounded-full overflow-hidden">
                      <div className="h-full w-[99%] neural-progress rounded-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-[#1a1c1c]">Hallucination Reduction</span>
                      <span className="text-[#9026c3] font-bold text-lg">84%</span>
                    </div>
                    <div className="h-3 w-full bg-[#eeeeee] rounded-full overflow-hidden">
                      <div className="h-full w-[84%] neural-progress rounded-full opacity-80" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Radial Gauges */}
              <div className="flex flex-row justify-center items-center gap-8 sm:gap-12">
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-[#eeeeee]" cx="96" cy="96" fill="transparent" r="76" stroke="currentColor" strokeWidth="12" />
                    <circle
                      className="text-[#4441cc] neural-progress"
                      cx="96"
                      cy="96"
                      fill="transparent"
                      r="76"
                      stroke="currentColor"
                      strokeDasharray="477.5"
                      strokeDashoffset="38"
                      strokeWidth="12"
                      style={{ strokeLinecap: 'round' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-extrabold text-[#1a1c1c]">92%</span>
                    <span className="text-[10px] font-bold text-[#464554] tracking-widest uppercase">EFFICIENCY</span>
                  </div>
                </div>

                <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-[#eeeeee]" cx="96" cy="96" fill="transparent" r="76" stroke="currentColor" strokeWidth="12" />
                    <circle
                      className="text-[#9026c3] neural-progress"
                      cx="96"
                      cy="96"
                      fill="transparent"
                      r="76"
                      stroke="currentColor"
                      strokeDasharray="477.5"
                      strokeDashoffset="105"
                      strokeWidth="12"
                      style={{ strokeLinecap: 'round' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-extrabold text-[#1a1c1c]">78%</span>
                    <span className="text-[10px] font-bold text-[#464554] tracking-widest uppercase">SPEED UP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final Call To Action (CTA) */}
        <section className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-20">
          <div className="animated-gradient-border p-[2px]">
            <div className="glass-card rounded-[32px] p-10 sm:p-16 text-center overflow-hidden relative shadow-2xl">
              <h2 className="text-3xl sm:text-5xl lg:text-[56px] font-bold text-[#1a1c1c] leading-tight mb-6 tracking-tighter relative z-10">
                Join the Future of<br />Verified Intelligence
              </h2>
              <p className="text-base sm:text-lg text-[#464554] max-w-xl mx-auto mb-10 relative z-10 font-normal">
                Integrate the world's most reliable retrieval agent into your research stack today. Scale without uncertainty.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                <button
                  onClick={() => router.push('/chat')}
                  className="px-10 py-4 sm:py-5 rounded-full bg-[#4441cc] text-white font-bold text-lg hover:scale-105 transition-all shadow-xl"
                >
                  Get Started Now
                </button>
                <button
                  onClick={() => router.push('/documents')}
                  className="px-10 py-4 sm:py-5 rounded-full border border-[#777586]/30 text-[#1a1c1c] font-bold text-lg hover:bg-white/50 transition-all"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-16 px-6 sm:px-20 bg-[#f9f9f9] border-t border-[#c7c4d7]/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-[1440px] mx-auto text-sm">
          <div className="col-span-1">
            <div className="text-2xl font-bold text-[#4441cc] mb-4">ADTU KB AI</div>
            <p className="text-xs text-[#464554] opacity-70 font-medium">
              © 2026 ADTU KB Intelligence. Grounded & Confidence-Aware RAG.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h5 className="text-xs font-bold text-[#4441cc] uppercase tracking-wider">Resources</h5>
            <Link className="text-[#464554] hover:text-[#4441cc] transition-colors" href="/documents">
              Whitepaper
            </Link>
            <Link className="text-[#464554] hover:text-[#4441cc] transition-colors" href="/chat">
              Terminal
            </Link>
            <Link className="text-[#464554] hover:text-[#4441cc] transition-colors" href="/notices">
              Notices API
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h5 className="text-xs font-bold text-[#4441cc] uppercase tracking-wider">Company</h5>
            <a className="text-[#464554] hover:text-[#4441cc] transition-colors" href="#research">
              Ethics & Audit
            </a>
            <a className="text-[#464554] hover:text-[#4441cc] transition-colors" href="#performance">
              System Status
            </a>
            <a className="text-[#464554] hover:text-[#4441cc] transition-colors" href="#architecture">
              Privacy Shield
            </a>
          </div>

          <div className="flex flex-col gap-4">
            <h5 className="text-xs font-bold text-[#4441cc] uppercase tracking-wider">Subscribe</h5>
            <div className="relative">
              <input
                className="w-full bg-[#eeeeee] border-none rounded-lg px-4 py-3 text-xs text-[#1a1c1c] placeholder:text-[#464554]/50 focus:outline-none"
                placeholder="Email address"
                type="email"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4441cc]">
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Calling Agent Modal Overlay */}
      <CallingAgentModal
        isOpen={isCallingModalOpen}
        onClose={() => setIsCallingModalOpen(false)}
      />
    </div>
  );
}
