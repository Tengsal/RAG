import 'dotenv/config';
import mongoose from 'mongoose';
import readline from 'readline';
import { performance } from 'perf_hooks';
import { AdtuCourse } from '../models/AdtuCourse';
import { AdtuUniversityInfo } from '../models/AdtuUniversityInfo';
import { buildSystemPrompt, POST_GREETING_RULES } from '../prompts';

type Role = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: Role;
  content: string;
}

const MONGODB_URI = process.env.MONGODB_URI;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:1.7b';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is missing in environment.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ollama helper
// ─────────────────────────────────────────────────────────────────────────────

function stripThinkBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

async function ollamaChat(messages: ChatMessage[], options?: any): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.2,
        top_p: 0.9,
        num_predict: 300,
        ...(options || {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${body}`);
  }

  const json: any = await res.json();
  return stripThinkBlocks(json?.message?.content || '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool schemas, described to local LLM as JSON-only protocol
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_DECISION_SYSTEM = `
You are a tool-routing layer for an Assam Down Town University voice counsellor.

You must return ONLY valid JSON. No markdown. No explanation.

Available tools:

1. query_course_fees_eligibility
Use when user asks about:
- course fees
- tuition fee
- total fee
- eligibility
- percentage requirement
- duration
- specialization
- placement partners
- course details

Arguments:
{
  "course_name": "BCA or B.Tech CSE or MBA etc",
  "degree_level": "UG" | "PG" | "Any"
}

2. query_university_info
Use when user asks about:
- Vice Chancellor, Chancellor, Registrar, Dean, Controller
- a named person
- scholarships
- attendance rule
- academic calendar
- admission documents
- application process
- hostel, library, transport, student services
- anti-ragging committee, grievance committee, ICC
- university address/contact/policies

Arguments:
{
  "topic": "full user topic"
}

3. transfer_call
Use ONLY when user asks to speak to a human counsellor, office, representative, or wants direct transfer.

Arguments:
{
  "transfer_number": "+919678926411",
  "reason": "why transfer is requested"
}

If no tool is needed, answer directly.

Return exactly one JSON object in this format:

For tool:
{
  "type": "tool_call",
  "toolName": "query_university_info",
  "args": { "topic": "who is the vice chancellor" }
}

For direct answer:
{
  "type": "answer",
  "content": "Sure, what's your question?"
}

Important behavior:
- If user says "Can I ask you a question?", do NOT ask qualification. Answer directly: "Sure, what's your question?"
- If user says they are busy, ask for callback time.
- If user gives qualification, acknowledge it.
- Do not force the admissions script if user is asking something else.
`;

function safeJsonParse(raw: string): any | null {
  const cleaned = stripThinkBlocks(raw);

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Try extracting first JSON object from messy output
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

// Fallback router only if local model fails JSON.
// This keeps the test harness usable even if qwen outputs extra text.
function ruleBasedFallback(userInput: string): any {
  const q = userInput.toLowerCase();

  if (/human|counsellor|counselor|representative|office|transfer|real person/.test(q)) {
    return {
      type: 'tool_call',
      toolName: 'transfer_call',
      args: {
        transfer_number: '+919678926411',
        reason: 'Caller requested human counsellor',
      },
    };
  }

  if (/fee|fees|cost|tuition|eligibility|percentage|duration|specialization|placement|course detail/.test(q)) {
    let courseName = userInput;
    if (/bca/.test(q)) courseName = 'BCA';
    else if (/bba/.test(q)) courseName = 'BBA';
    else if (/mba/.test(q)) courseName = 'MBA';
    else if (/mca/.test(q)) courseName = 'MCA';
    else if (/nursing/.test(q)) courseName = 'B.Sc Nursing';
    else if (/pharm/.test(q)) courseName = 'B.Pharm';
    else if (/cse|computer science|btech|b\.tech/.test(q)) courseName = 'B.Tech CSE';

    return {
      type: 'tool_call',
      toolName: 'query_course_fees_eligibility',
      args: {
        course_name: courseName,
        degree_level: 'Any',
      },
    };
  }

  if (
    /vice chancellor|vc|chancellor|registrar|dean|controller|director|scholarship|attendance|calendar|hostel|library|transport|document|admission|anti.?ragging|committee|grievance|icc|address|contact|policy|rules/.test(q)
  ) {
    return {
      type: 'tool_call',
      toolName: 'query_university_info',
      args: {
        topic: userInput,
      },
    };
  }

  return {
    type: 'answer',
    content: /ask.*question|question/.test(q)
      ? "Sure, what's your question?"
      : 'Sure, please tell me.',
  };
}

async function decideTool(userInput: string, conversationHistory: ChatMessage[]): Promise<any> {
  const raw = await ollamaChat([
    { role: 'system', content: TOOL_DECISION_SYSTEM },
    ...conversationHistory.slice(-6),
    { role: 'user', content: userInput },
  ], {
    temperature: 0,
    num_predict: 220,
  });

  const parsed = safeJsonParse(raw);

  if (!parsed || !parsed.type) {
    console.log('\n⚠️ Local model did not return valid JSON. Raw output:');
    console.log(raw);
    console.log('⚠️ Using rule-based fallback router.\n');
    return ruleBasedFallback(userInput);
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB tool: course info
// ─────────────────────────────────────────────────────────────────────────────

async function queryAdtuCourseInfo(courseName: string, degreeLevel?: string): Promise<string> {
  try {
    const query: any = {};

    if (degreeLevel && degreeLevel !== 'Any') {
      query.degreeLevel = degreeLevel;
    }

    const regex = new RegExp(
      courseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i',
    );

    let course = await AdtuCourse.findOne({
      ...query,
      $or: [
        { courseName: regex },
        { courseCode: regex },
        { department: regex },
        { specializations: regex },
      ],
    });

    if (!course) {
      course = await AdtuCourse.findOne({
        $or: [
          { courseName: regex },
          { courseCode: regex },
          { specializations: regex },
        ],
      });
    }

    if (course) {
      return `[AdtU Course Data]: ${course.courseName} (${course.degreeLevel}) at Assam Down Town University. ` +
        `Total Tuition Fee: Rs. ${(course.totalTuitionFee / 100000).toFixed(2)} Lakhs ` +
        `(Rs. ${(course.annualTuitionFee / 100000).toFixed(2)} Lakhs per year). ` +
        `Duration: ${course.durationYears} Years (${course.durationSemesters} Semesters). ` +
        `Eligibility: ${course.eligibilityCriteria}. ` +
        `Specializations: ${(course.specializations || []).join(', ')}. ` +
        `Top Placement Partners: ${(course.placementPartners || []).slice(0, 4).join(', ')}.`;
    }

    return `[AdtU Course Data]: No exact course found for "${courseName}".`;
  } catch (e: any) {
    return `[AdtU Course Data]: MongoDB course query error: ${e?.message}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB tool: university info
// ─────────────────────────────────────────────────────────────────────────────

async function queryUniversityInfo(topic: string): Promise<string> {
  try {
    const topicLower = (topic || '').toLowerCase();

    let section = 'administration';

    if (/vice chancellor|vc|president|chancellor|registrar|dean|controller|director|pro vice/i.test(topicLower)) {
      section = 'administration';
    } else if (/scholarship|waiver|financial aid|xopun|merit scholarship|sports scholarship/i.test(topicLower)) {
      section = 'fees_and_scholarships';
    } else if (/attendance|backlog|promotion|ragging|student conduct|examination process/i.test(topicLower)) {
      section = 'rules_and_policies';
    } else if (/admission|documents? required|eligibility matrix|application process|apply/i.test(topicLower)) {
      section = 'admissions';
    } else if (/academic calendar|semester (start|begin|end)|exam date|holiday|orientation/i.test(topicLower)) {
      section = 'academic_calendar';
    } else if (/library|hostel|transport|bus|dosa|grievance|equal opportunity|icc|placement cell|counselling/i.test(topicLower)) {
      section = 'student_services';
    } else if (/anti[- ]?ragging|committee|internal complaints/i.test(topicLower)) {
      section = 'committees';
    } else if (/university address|contact|phone|email|location/i.test(topicLower)) {
      section = 'university_metadata';
    }

    const record = await AdtuUniversityInfo.findOne({ section });

    if (!record) {
      return `[AdtU Info]: No data found for "${topic}".`;
    }

    return `[AdtU ${section.replace(/_/g, ' ')}]: ${formatUniversityData(section, record.data, topicLower)}`;
  } catch (e: any) {
    return `[AdtU Info]: MongoDB university info query error: ${e?.message}`;
  }
}

function formatUniversityData(section: string, data: any, topicLower: string): string {
  try {
    switch (section) {
      case 'administration': {
        const leaders = data?.senior_leadership || [];
        const directors = data?.key_directors || [];
        const allPeople = [...leaders, ...directors];

        const posMatch = allPeople.find((p: any) =>
          p.position &&
          new RegExp(
            p.position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            'i',
          ).test(topicLower),
        );

        if (posMatch) {
          return `${posMatch.position}: ${posMatch.name}`;
        }

        const nameMatch = allPeople.find((p: any) =>
          p.name && topicLower.includes(String(p.name).toLowerCase().replace(/\./g, '')),
        );

        if (nameMatch) {
          return `${nameMatch.name}${nameMatch.position ? ` is ${nameMatch.position}` : ''}.`;
        }

        return leaders
          .slice(0, 5)
          .map((p: any) => `${p.position}: ${p.name}`)
          .join('; ');
      }

      case 'fees_and_scholarships': {
        const sch = data?.scholarships || {};
        const parts: string[] = [];

        if (Array.isArray(sch.merit_based)) {
          parts.push(
            'Merit scholarships: ' +
              sch.merit_based
                .map((s: any) => `${s.percentage} gets ${s.benefit}`)
                .join('; '),
          );
        }

        if (Array.isArray(sch.sports)) {
          parts.push(
            'Sports scholarships: ' +
              sch.sports
                .map((s: any) => `${s.level} gets ${s.benefit}`)
                .join('; '),
          );
        }

        if (sch.specially_abled) {
          parts.push(`Specially abled students: ${sch.specially_abled}`);
        }

        if (sch.xopun_scheme_2026) {
          parts.push(
            `Xopun Scheme 2026: ${sch.xopun_scheme_2026.description}. Deadline: ${sch.xopun_scheme_2026.deadline}`,
          );
        }

        return parts.join('. ');
      }

      case 'rules_and_policies': {
        if (/attendance/.test(topicLower) && data?.attendance) {
          return `Minimum attendance required is ${data.attendance.minimum_required}. ${data.attendance.consequence}.`;
        }

        if (/backlog|promotion/.test(topicLower)) {
          return (data?.promotion_and_backlog || []).join(' ');
        }

        if (/exam|examination/.test(topicLower)) {
          return `Examination process: ${(data?.examination_process || []).join(' → ')}.`;
        }

        if (/ragging/.test(topicLower)) {
          return data?.student_conduct || 'Ragging is strictly prohibited.';
        }

        return `Attendance requirement is ${data?.attendance?.minimum_required || '75%'}. Ragging is strictly prohibited.`;
      }

      case 'admissions': {
        if (/document/.test(topicLower)) {
          return `Required documents: ${(data?.required_documents || []).join(', ')}.`;
        }

        if (/process|apply|application/.test(topicLower)) {
          return `Application process: ${(data?.application_process || []).join(', ')}.`;
        }

        return `Admission documents include ${(data?.required_documents || []).join(', ')}.`;
      }

      case 'academic_calendar': {
        const year = data?.academic_year || '2026-27';
        const odd = data?.odd_semester;
        const even = data?.even_semester;

        return `Academic year ${year}. Odd semester is from ${odd?.start} to ${odd?.end}. Even semester is from ${even?.start} to ${even?.end}.`;
      }

      case 'student_services': {
        if (/hostel/.test(topicLower)) {
          return `Hostel facilities include ${(data?.hostel?.facilities || []).slice(0, 6).join(', ')}.`;
        }

        if (/library/.test(topicLower)) {
          return `Library resources include ${(data?.library?.resources || []).slice(0, 6).join(', ')}.`;
        }

        if (/transport|bus/.test(topicLower)) {
          return `Transport services include ${(data?.transport?.services || []).join(', ')}.`;
        }

        return `Student services include ${(data?.support_cells || []).slice(0, 5).map((c: any) => c.name).join(', ')}.`;
      }

      case 'committees': {
        if (Array.isArray(data)) {
          const anti = data.find((c: any) => /anti.?ragging/i.test(c.name || ''));
          const grievance = data.find((c: any) => /grievance/i.test(c.name || ''));
          const icc = data.find((c: any) => /internal complaints|icc/i.test(c.name || ''));

          if (/anti/.test(topicLower) && anti) {
            return `Anti-Ragging Committee chairperson is ${anti.chairperson}, co-chairperson is ${anti.co_chairperson}, and member secretary is ${anti.member_secretary}.`;
          }

          if (/grievance/.test(topicLower) && grievance) {
            return `Student Grievance Redressal Committee members include ${(grievance.members || []).slice(0, 6).join(', ')}.`;
          }

          if (/icc|internal complaints/.test(topicLower) && icc) {
            return `Internal Complaints Committee purpose: ${icc.purpose}.`;
          }
        }

        return 'Committees include Anti-Ragging Committee, Student Grievance Redressal Committee, and Internal Complaints Committee.';
      }

      case 'university_metadata': {
        return `${data?.name}. Address: ${data?.address}. Admission contact: ${data?.admission_contact?.email}, ${(data?.admission_contact?.phone || []).join(', ')}.`;
      }

      default:
        return 'University information is available.';
    }
  } catch (e: any) {
    return `Formatting error: ${e?.message}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Final response generation using local Ollama
// ─────────────────────────────────────────────────────────────────────────────

async function generateFinalAnswer(
  conversationHistory: ChatMessage[],
  userInput: string,
  toolResult?: string,
): Promise<string> {
  const finalSystem = `
You are Kavya, a warm human admissions and career counsellor from Assam Down Town University, Guwahati.

Never say you are AI.

Answer like a real phone counsellor:
- 1 to 2 short spoken sentences only.
- Follow the caller's lead.
- If they ask a question, answer that question directly.
- Do not force qualification questions when caller wants to ask something.
- Use the tool result as factual source if provided.
- Same language/style as caller: English, Hindi, or Hinglish.
- Do not output JSON.
- Do not mention "tool", "database", or "MongoDB".
- Say "Assam Down Town University" clearly, not abbreviations unless natural.

Current post-greeting rule:
${POST_GREETING_RULES}

${toolResult ? `FACTUAL TOOL RESULT:\n${toolResult}` : ''}
`;

  const response = await ollamaChat([
    { role: 'system', content: finalSystem },
    ...conversationHistory.slice(-8),
    { role: 'user', content: userInput },
  ], {
    temperature: 0.35,
    num_predict: 180,
  });

  return response
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CLI loop
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected to MongoDB');

  console.log(`🧠 Using local Ollama model: ${OLLAMA_MODEL}`);
  console.log(`🌐 Ollama URL: ${OLLAMA_URL}`);

  // Quick health check
  try {
    await ollamaChat([{ role: 'user', content: 'Say OK only.' }], { num_predict: 10 });
    console.log('✅ Ollama is responding\n');
  } catch (err: any) {
    console.error('❌ Ollama is not responding.');
    console.error(`   Make sure Ollama is running and model exists: ollama run ${OLLAMA_MODEL}`);
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('ADTU VOICE AGENT — LOCAL OLLAMA TEXT TEST HARNESS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('No Groq. No phone call. No Deepgram. No Sarvam.');
  console.log('Type test questions. Type "quit" to exit.');
  console.log('');
  console.log('Try:');
  console.log('  Can I ask you a question?');
  console.log('  Who is the Vice Chancellor?');
  console.log('  What scholarships are available?');
  console.log('  What is the attendance requirement?');
  console.log('  What is the fee for BCA?');
  console.log('  Tell me about hostel facilities.');
  console.log('═══════════════════════════════════════════════════════════════');

  const conversationHistory: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
  ];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question('\n[SIMULATED STT] You: ', async (input: string) => {
      const userInput = input.trim();

      if (!userInput) {
        ask();
        return;
      }

      if (['quit', 'exit', 'q'].includes(userInput.toLowerCase())) {
        console.log('👋 Bye.');
        await mongoose.disconnect();
        rl.close();
        process.exit(0);
      }

      conversationHistory.push({ role: 'user', content: userInput });

      console.log('\n' + '─'.repeat(70));

      try {
        const turnStartedAt = performance.now();
        const routingStartedAt = performance.now();
        const decision = await decideTool(userInput, conversationHistory);
        console.log(`⏱️  Tool routing: ${(performance.now() - routingStartedAt).toFixed(0)} ms`);

        console.log('🧭 LOCAL TOOL DECISION:');
        console.log(JSON.stringify(decision, null, 2));

        let toolResult: string | undefined;

        if (decision.type === 'tool_call') {
          const toolStartedAt = performance.now();
          if (decision.toolName === 'query_course_fees_eligibility') {
            toolResult = await queryAdtuCourseInfo(
              decision.args?.course_name || userInput,
              decision.args?.degree_level || 'Any',
            );
          } else if (decision.toolName === 'query_university_info') {
            toolResult = await queryUniversityInfo(
              decision.args?.topic || userInput,
            );
          } else if (decision.toolName === 'transfer_call') {
            toolResult = `[Call Transfer]: Transfer requested to ${decision.args?.transfer_number || '+919678926411'}. Reason: ${decision.args?.reason || 'Caller requested human counsellor'}.`;
          }
          console.log(`⏱️  Tool lookup: ${(performance.now() - toolStartedAt).toFixed(0)} ms`);

          console.log('\n📊 TOOL RESULT:');
          console.log(toolResult);
        }

        let finalAnswer = '';
        const responseStartedAt = performance.now();

        if (decision.type === 'answer' && decision.content) {
          // Still pass through final-answer style cleaner to simulate agent voice.
          finalAnswer = await generateFinalAnswer(
            conversationHistory,
            userInput,
            undefined,
          );

          // If local model overthinks, use direct content as fallback.
          if (!finalAnswer || finalAnswer.length > 400) {
            finalAnswer = decision.content;
          }
        } else {
          finalAnswer = await generateFinalAnswer(
            conversationHistory,
            userInput,
            toolResult,
          );
        }
        console.log(`⏱️  Response generation: ${(performance.now() - responseStartedAt).toFixed(0)} ms`);

        console.log('\n🤖 FINAL AGENT RESPONSE:');
        console.log(finalAnswer);
        console.log(`⏱️  Total turn: ${(performance.now() - turnStartedAt).toFixed(0)} ms`);

        conversationHistory.push({ role: 'assistant', content: finalAnswer });

        console.log('─'.repeat(70));
      } catch (err: any) {
        console.error('❌ Test error:', err.message);
      }

      ask();
    });
  };

  ask();
}

main().catch(async (err) => {
  console.error('❌ Fatal error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
