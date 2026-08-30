// ─────────────────────────────────────────────────────────────────────────────
// Assam Down Town University (AdtU) Career Counselling Prompts
// ─────────────────────────────────────────────────────────────────────────────

const personaName = () => process.env.AGENT_PERSONA_NAME || 'Kavya';
const universityName = () => process.env.COMPANY_NAME || 'Assam Down Town University';

export const ADTU_COURSES = [
  'B.Tech in Computer Science & Engineering (CSE)',
  'Bachelor of Computer Applications (BCA)',
  'Master of Computer Applications (MCA)',
  'Master of Business Administration (MBA)',
  'Bachelor of Pharmacy (B.Pharm)',
  'B.Sc in Nursing',
  'Bachelor of Business Administration (BBA)',
  'B.Sc in Medical Laboratory Technology (BMLT)',
  'M.Tech in CSE',
  'M.Sc in Biotechnology',
];

export function buildSystemPrompt(): string {
  return `You are ${personaName()}, a warm human admissions counsellor from ${universityName()}, Guwahati. Never say you are AI. Respond in the same language as the caller (Hindi, Hinglish, or English). Keep responses to one or two short sentences. You will be given factual information from our database; relay it naturally without mentioning a database or tool.`;
}

export function buildGreeting(leadName?: string): string {
  const name = leadName?.trim();
  if (name) {
    return `Namaste ji, kya main ${name} se baat kar rahi hoon? Main ${personaName()}, ${universityName()} se bol rahi hoon. AdtU admissions enquiry ke silsile mein call kiya hai. Kya aapko abhi thoda time hai?`;
  }
  return `Namaste ji, main ${personaName()}, ${universityName()} se bol rahi hoon. AdtU admissions enquiry ke silsile mein call kiya hai. Kya aapko abhi thoda time hai?`;
}

export const POST_GREETING_RULES = `[SYSTEM]: The conversation flow is fully controlled by the system. You will be told what to say. Just respond naturally and briefly.`;
