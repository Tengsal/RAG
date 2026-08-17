'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chatInput, setChatInput] = useState('');

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

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
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

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-[100] bg-[#f9f9f9]/30 backdrop-blur-3xl border-b border-white/10 shadow-[0_8px_32px_0_rgba(68,65,204,0.1)]">
        <nav className="flex justify-between items-center px-6 sm:px-20 py-4 max-w-[1440px] mx-auto">
          <Link href="/" className="text-2xl sm:text-3xl font-bold text-[#4441cc] tracking-tighter font-['Geist']">
            UAAA AI
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a className="text-[#4441cc] font-semibold border-b-2 border-[#4441cc] pb-1" href="#research">
              Research
            </a>
            <a className="text-[#464554] hover:text-[#4441cc] transition-colors" href="#architecture">
              Architecture
            </a>
            <a className="text-[#464554] hover:text-[#4441cc] transition-colors" href="#performance">
              Performance
            </a>
            <Link className="text-[#464554] hover:text-[#4441cc] transition-colors" href="/documents">
              Docs
            </Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="px-4 sm:px-6 py-2 rounded-full text-[#4441cc] font-semibold border border-[#4441cc]/20 hover:bg-[#4441cc]/5 transition-all text-xs sm:text-sm"
            >
              Join Waitlist
            </button>
            <button
              onClick={() => router.push('/chat')}
              className="px-4 sm:px-6 py-2 rounded-full bg-[#4441cc] text-white font-semibold hover:bg-[#4441cc]/90 transition-all scale-95 active:scale-90 shadow-lg text-xs sm:text-sm"
            >
              Deploy Agent
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative pt-32 pb-24 overflow-hidden">
        {/* Hero Section */}
        <section id="research" className="px-6 sm:px-20 max-w-[1440px] mx-auto text-center mb-32 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border-[#c7c4d7]/30 text-xs font-semibold text-[#4441cc] mb-8 shimmer">
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            <span>ACADEMIC-GRADE RELIABILITY</span>
          </div>

          <h1
            id="hero-title"
            className="text-5xl sm:text-7xl lg:text-[72px] font-bold text-[#1a1c1c] mb-6 tracking-tighter parallax-layer leading-[1.1]"
          >
            AI That Knows <span className="text-[#4441cc] italic">When It Knows</span>
          </h1>

          <p className="text-base sm:text-xl text-[#464554] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Leveraging Adaptive Retrieval and Uncertainty Estimation to provide verified, hallucination-free intelligence backed by global university archives.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => router.push('/chat')}
              className="px-10 py-5 rounded-full bg-[#4441cc] text-white font-semibold text-lg hover:shadow-[0_0_40px_rgba(68,65,204,0.3)] transition-all shadow-xl"
            >
              Explore Research
            </button>
            <button
              onClick={() => router.push('/chat')}
              className="px-10 py-5 rounded-full glass-card text-[#1a1c1c] font-semibold text-lg hover:bg-white/50 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">play_circle</span>
              <span>Watch Demo</span>
            </button>
          </div>

          {/* Abstract Floating Glow Orbs */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#4441cc]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-40 -right-20 w-80 h-80 bg-[#9026c3]/10 rounded-full blur-[120px] pointer-events-none" />
        </section>

        {/* AI Chat Terminal Demo */}
        <section className="px-6 sm:px-20 max-w-5xl mx-auto mb-40">
          <div className="animated-gradient-border p-[1px]">
            <div className="glass-card rounded-3xl overflow-hidden p-2 sm:p-4">
              <div className="bg-white/50 rounded-2xl p-6 sm:p-10 shadow-inner">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-[#4441cc] flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined text-2xl">psychology</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1a1c1c]">UAAA Research Terminal</h3>
                    <p className="text-xs text-[#464554] opacity-60 font-semibold">Real-time adaptive retrieval active</p>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  {/* User Question */}
                  <div className="flex gap-4 max-w-[90%] sm:max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-[#e8e8e8] shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                    <div className="bg-[#eeeeee] p-4 rounded-2xl rounded-tl-none text-sm text-[#1a1c1c] leading-relaxed">
                      What are the long-term impacts of neural plasticity on adaptive retrieval in large language models?
                    </div>
                  </div>

                  {/* AI Verified Answer */}
                  <div className="flex gap-4 max-w-[95%] sm:max-w-[85%] ml-auto flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-[#4441cc] shrink-0 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                    </div>
                    <div className="glass-card p-5 rounded-2xl rounded-tr-none text-sm text-[#1a1c1c] border-[#4441cc]/20 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-[#4441cc]/10 text-[#4441cc] text-[10px] font-bold rounded">
                          CONFIDENCE: 98.4%
                        </span>
                        <span className="px-2.5 py-1 bg-[#0055a9]/10 text-[#0055a9] text-[10px] font-bold rounded">
                          VERIFIED SOURCE
                        </span>
                      </div>
                      <p className="leading-relaxed">
                        Neural plasticity in adaptive retrieval systems facilitates dynamic weight recalibration. According to{' '}
                        <strong>Dr. Aris (2023)</strong> from the{' '}
                        <span className="text-[#4441cc] underline decoration-dotted">Oxford University Archive</span>, this allows for a 42% reduction in cognitive interference during high-uncertainty tasks...
                      </p>
                      <div className="mt-4 pt-3 border-t border-[#c7c4d7]/30 flex gap-2 overflow-x-auto pb-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#e2e2e2]/50 rounded-full text-xs font-semibold whitespace-nowrap">
                          <span className="material-symbols-outlined text-[14px]">description</span> Oxford_Paper_2023.pdf
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#e2e2e2]/50 rounded-full text-xs font-semibold whitespace-nowrap">
                          <span className="material-symbols-outlined text-[14px]">description</span> Neural_Dynamic_v2.doc
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="w-full bg-[#f3f3f4] border-b-2 border-[#4441cc]/20 focus:border-[#4441cc] focus:outline-none transition-all py-4 px-6 rounded-xl text-sm text-[#1a1c1c] placeholder:text-[#464554]/40"
                    placeholder="Ask anything with verifiable precision..."
                    type="text"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#4441cc] text-white rounded-lg flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                  >
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Adaptive Workflow Section ("The Uncertainty-Aware Lifecycle") */}
        <section id="architecture" className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-40 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-[#1a1c1c] mb-16 tracking-tight">
            The Uncertainty-Aware Lifecycle
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {/* Horizontal Connector Line */}
            <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-[#4441cc]/20 via-[#4441cc] to-[#4441cc]/20 -z-10" />

            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center mb-6 text-[#4441cc] shadow-xl border-[#4441cc]/30">
                <span className="material-symbols-outlined text-4xl">search_insights</span>
              </div>
              <h4 className="text-lg font-bold text-[#1a1c1c] mb-2">Query Parsing</h4>
              <p className="text-xs font-semibold text-[#464554] px-4">Semantic intent decomposition</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center mb-6 text-[#9026c3] shadow-xl border-[#9026c3]/30">
                <span className="material-symbols-outlined text-4xl">hub</span>
              </div>
              <h4 className="text-lg font-bold text-[#1a1c1c] mb-2">Embedding</h4>
              <p className="text-xs font-semibold text-[#464554] px-4">Multi-dimensional vector mapping</p>
            </div>

            {/* Step 3 (The Core Controller) */}
            <div className="flex flex-col items-center relative">
              <div className="w-24 h-24 rounded-[2.5rem] glass-card flex items-center justify-center mb-6 text-[#4441cc] shadow-2xl border-[#4441cc]/50 animated-gradient-border p-1">
                <div className="w-full h-full rounded-[2.2rem] bg-white flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-5xl text-[#4441cc]">settings_input_component</span>
                </div>
              </div>
              <h4 className="text-xl font-extrabold text-[#1a1c1c] mb-2">Controller</h4>
              <p className="text-xs font-semibold text-[#464554] px-4">Adaptive retrieval steering</p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center mb-6 text-[#0055a9] shadow-xl border-[#0055a9]/30">
                <span className="material-symbols-outlined text-4xl">analytics</span>
              </div>
              <h4 className="text-lg font-bold text-[#1a1c1c] mb-2">Uncertainty</h4>
              <p className="text-xs font-semibold text-[#464554] px-4">Probability of hallucination check</p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center mb-6 text-[#4441cc] shadow-xl border-[#4441cc]/30">
                <span className="material-symbols-outlined text-4xl">verified_user</span>
              </div>
              <h4 className="text-lg font-bold text-[#1a1c1c] mb-2">Verified Answer</h4>
              <p className="text-xs font-semibold text-[#464554] px-4">Final citation-backed output</p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 sm:px-20 max-w-[1440px] mx-auto mb-40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-10 rounded-3xl hover:-translate-y-2 transition-all duration-300 shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4441cc] to-blue-400 flex items-center justify-center text-white mb-8 shadow-lg">
                <span className="material-symbols-outlined text-3xl">menu_book</span>
              </div>
              <h3 className="text-2xl font-bold text-[#1a1c1c] mb-4">Citation-Backed</h3>
              <p className="text-sm text-[#464554] leading-relaxed">
                Every claim is linked to a source. Access peer-reviewed journals, university repositories, and verified databases in real-time.
              </p>
            </div>

            <div className="glass-card p-10 rounded-3xl hover:-translate-y-2 transition-all duration-300 shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#9026c3] to-pink-400 flex items-center justify-center text-white mb-8 shadow-lg">
                <span className="material-symbols-outlined text-3xl">format_image_left</span>
              </div>
              <h3 className="text-2xl font-bold text-[#1a1c1c] mb-4">Hallucination Free</h3>
              <p className="text-sm text-[#464554] leading-relaxed">
                Our uncertainty layers prevent the model from 'guessing.' If the agent doesn't know, it will find the source or admit uncertainty.
              </p>
            </div>

            <div className="glass-card p-10 rounded-3xl hover:-translate-y-2 transition-all duration-300 shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0055a9] to-teal-400 flex items-center justify-center text-white mb-8 shadow-lg">
                <span className="material-symbols-outlined text-3xl">bar_chart_4_bars</span>
              </div>
              <h3 className="text-2xl font-bold text-[#1a1c1c] mb-4">Confidence Metrics</h3>
              <p className="text-sm text-[#464554] leading-relaxed">
                Transparent probability scoring on every response. Understand exactly how reliable the information is before making decisions.
              </p>
            </div>
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
                  UAAA outperforms standard RAG pipelines by identifying data gaps before they reach the generative stage.
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
            <div className="text-2xl font-bold text-[#4441cc] mb-4">UAAA AI</div>
            <p className="text-xs text-[#464554] opacity-70 font-medium">
              © 2026 Neural Research Lab. Pioneering Uncertainty-Aware Intelligence.
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
    </div>
  );
}
