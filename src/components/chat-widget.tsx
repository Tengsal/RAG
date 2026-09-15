'use client';

import React, { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ *
 * Structured-answer parsing
 * ------------------------------------------------------------------ */

export type BlockType = 'matches' | 'facts' | 'guidance' | 'comparison' | 'process' | 'text';
export type Tone = 'ok' | 'warn' | 'no' | 'plain';

export interface Block {
  type: BlockType;
  title?: string;
  tone?: Tone;
  content: string;
}

interface Source {
  source: string;
  page?: number;
  category?: string;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  blocks?: Block[];
  sources?: Source[];
}

const HEADERS: { re: RegExp; type: BlockType; title: string; tone?: Tone }[] = [
  { re: /^top matches:?$/i, type: 'matches', title: 'Top matches', tone: 'plain' },
  { re: /^eligible:?$/i, type: 'matches', title: 'Eligible', tone: 'ok' },
  { re: /^needs more info:?$/i, type: 'matches', title: 'Needs more info', tone: 'warn' },
  { re: /^not eligible:?$/i, type: 'matches', title: 'Not eligible', tone: 'no' },
  { re: /^official facts:?$/i, type: 'facts', title: 'Official University Facts' },
  {
    re: /^guidance \(system inference,?\s*not official\):?$/i,
    type: 'guidance',
    title: 'AI Guidance (Inference)',
  },
  { re: /^comparison:?$/i, type: 'comparison', title: 'Comparison' },
  { re: /^official application process:?$/i, type: 'process', title: 'Official Application Process' },
  { re: /^required documents:?$/i, type: 'process', title: 'Required Documents' },
  { re: /^personalized note:?$/i, type: 'text', title: 'Personalized note' },
];

export function parseStructuredAnswer(answer: string): Block[] {
  const blocks: Block[] = [];

  for (const raw of (answer || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const header = HEADERS.find((h) => h.re.test(line));
    if (header) {
      blocks.push({ type: header.type, title: header.title, tone: header.tone, content: '' });
      continue;
    }

    const last = blocks[blocks.length - 1];
    if (last) last.content += (last.content ? '\n' : '') + line;
    else blocks.push({ type: 'text', content: line });
  }

  return blocks.filter((b) => b.title || b.content);
}

/* ------------------------------------------------------------------ *
 * Block renderers
 * ------------------------------------------------------------------ */

const bullets = (content: string) =>
  content
    .split('\n')
    .map((l) => l.trim().replace(/^[•\-*]\s*/, ''))
    .filter(Boolean);

function MatchesBlock({ block }: { block: Block }) {
  const icon =
    block.tone === 'ok'
      ? { glyph: 'check_circle', cls: 'text-emerald-600' }
      : block.tone === 'warn'
        ? { glyph: 'error', cls: 'text-amber-500' }
        : block.tone === 'no'
          ? { glyph: 'cancel', cls: 'text-rose-500' }
          : { glyph: 'stars', cls: 'text-[#4441cc]' };

  return (
    <div className="rounded-2xl border border-[#c7c4d7]/40 bg-white p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#464554]">
        {block.title}
      </div>
      <ul className="space-y-2">
        {bullets(block.content).map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-[#1a1c1c]">
            <span className={`material-symbols-outlined text-[18px] shrink-0 ${icon.cls}`}>
              {icon.glyph}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FactsBlock({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border border-[#c7c4d7]/50 bg-[#f4f4f6] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#464554]">
        <span aria-hidden>📄</span>
        <span>{block.title}</span>
      </div>
      <ul className="space-y-1.5">
        {bullets(block.content).map((item, i) => (
          <li key={i} className="text-sm leading-relaxed text-[#1a1c1c]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuidanceBlock({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border border-[#4441cc]/25 bg-[#4441cc]/[0.06] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#4441cc]">
        <span aria-hidden>💡</span>
        <span>{block.title}</span>
      </div>
      <ul className="space-y-1.5">
        {bullets(block.content).map((item, i) => (
          <li key={i} className="text-sm leading-relaxed text-[#1a1c1c]">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] italic text-[#464554]/80">
        Based on your preferences, not official university policy.
      </p>
    </div>
  );
}

function ComparisonBlock({ block }: { block: Block }) {
  const rows = block.content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf(':');
      const label = sep === -1 ? line : line.slice(0, sep).trim();
      const rest = sep === -1 ? '' : line.slice(sep + 1);
      const cells = rest.split('|').map((cell) => {
        const i = cell.indexOf(':');
        return i === -1
          ? { name: '', value: cell.trim() }
          : { name: cell.slice(0, i).trim(), value: cell.slice(i + 1).trim() };
      });
      return { label, cells };
    });

  const names = rows[0]?.cells.map((c) => c.name) ?? [];

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#c7c4d7]/40 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#f4f4f6]">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-[#464554]">
              {block.title}
            </th>
            {names.map((n, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-bold text-[#4441cc]">
                {n}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#c7c4d7]/30">
              <td className="px-3 py-2 font-semibold text-[#464554]">{row.label}</td>
              {row.cells.map((c, j) => (
                <td key={j} className="px-3 py-2 text-[#1a1c1c]">
                  {c.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProcessBlock({ block }: { block: Block }) {
  return (
    <div className="rounded-2xl border border-[#c7c4d7]/40 bg-white p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[#464554]">
        {block.title}
      </div>
      <ol className="space-y-2">
        {bullets(block.content).map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-[#1a1c1c]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4441cc]/10 text-[11px] font-bold text-[#4441cc]">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'matches':
      return <MatchesBlock block={block} />;
    case 'facts':
      return <FactsBlock block={block} />;
    case 'guidance':
      return <GuidanceBlock block={block} />;
    case 'comparison':
      return <ComparisonBlock block={block} />;
    case 'process':
      return <ProcessBlock block={block} />;
    default:
      return (
        <div className="rounded-2xl border border-[#c7c4d7]/40 bg-white p-4">
          {block.title && (
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#464554]">
              {block.title}
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#1a1c1c]">{block.content}</p>
        </div>
      );
  }
}

function AssistantMessage({ msg }: { msg: Msg }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex w-full max-w-[92%] flex-col gap-3">
        {(msg.blocks ?? []).map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>

      {(msg.sources?.length ?? 0) > 0 && (
        <details className="w-full max-w-[92%] rounded-xl border border-[#c7c4d7]/40 bg-white/70 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[#464554]">
            View Sources ({msg.sources!.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {msg.sources!.map((s, i) => (
              <li key={i} className="font-mono text-[11px] text-[#464554]">
                {s.source}
                {s.page ? ` · p.${s.page}` : ''}
                {s.category ? ` · ${s.category}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Widget
 * ------------------------------------------------------------------ */

export function ChatWidget({
  isOpen,
  onClose,
  onOpenFullChat,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullChat?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const query = text.trim();
    if (!query || loading) return;

    setMessages((m) => [...m, { role: 'user', content: query }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const answer: string =
        data.answer ?? data.clarification_question ?? data.error ?? 'No response from Campus AI.';
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: answer,
          blocks: parseStructuredAnswer(answer),
          sources: data.sources ?? [],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Could not reach Campus AI. Please try again.',
          blocks: [{ type: 'text', content: 'Could not reach Campus AI. Please try again.' }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-end bg-black/30 backdrop-blur-sm p-0 sm:p-6">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-none border border-[#c7c4d7]/40 bg-[#f9f9f9] shadow-2xl sm:h-[640px] sm:max-h-[85vh] sm:w-[520px] sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#c7c4d7]/40 bg-white/80 px-5 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#4441cc]">forum</span>
            <div>
              <div className="text-sm font-bold text-[#1a1c1c]">Ask Campus AI</div>
              <div className="text-[11px] text-[#464554]">ADTU programmes, fees &amp; eligibility</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenFullChat && (
              <button
                onClick={onOpenFullChat}
                className="hidden text-[11px] font-semibold text-[#4441cc] hover:underline sm:block"
              >
                Full chat
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#464554] transition-colors hover:bg-[#eeeeee]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-[#c7c4d7]/40 bg-white p-4 text-sm text-[#464554]">
              Ask about any ADTU programme — eligibility, fees, comparisons or how to apply.
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  'I got 65% in class 12. What programmes am I eligible for?',
                  'which is better b.tech or bca?',
                  'I dont like maths can i choose bca?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-[#4441cc]/30 px-3 py-1.5 text-[11px] font-semibold text-[#4441cc] transition-colors hover:bg-[#4441cc]/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#4441cc] px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <AssistantMessage key={i} msg={msg} />
            ),
          )}

          {loading && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-[#c7c4d7]/40 bg-white px-4 py-3 w-fit">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-2 w-2 animate-pulse rounded-full bg-[#4441cc]/60"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-[#c7c4d7]/40 bg-white/80 px-4 py-3 backdrop-blur-xl"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about programmes, fees, eligibility…"
            className="flex-1 rounded-full border border-[#c7c4d7]/50 bg-[#f4f4f6] px-4 py-2.5 text-sm text-[#1a1c1c] placeholder:text-[#464554]/50 focus:outline-none focus:ring-2 focus:ring-[#4441cc]/30"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4441cc] text-white transition-all hover:bg-[#3835be] disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatWidget;
