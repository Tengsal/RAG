import axios from 'axios';
import { logger } from '../utils/logger';

interface GeminiSummaryResult {
  summaryText: string;
  keyQualification: string;
  coursesInquired: string[];
  feesDiscussed: string;
  callbackPreference: string;
  sentiment: 'enthusiastic' | 'interested' | 'neutral' | 'hesitant' | 'uninterested';
  actionItems: string[];
}

function getGeminiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && k.trim()) keys.push(k.trim());
  }
  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY.trim())) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  return keys;
}

let keyIndex = 0;

export async function generateGeminiSummary(transcript: string, leadName?: string): Promise<GeminiSummaryResult> {
  const keys = getGeminiKeys();
  if (keys.length === 0 || !transcript || transcript.trim().length < 20) {
    return {
      summaryText: 'Short or empty conversation.',
      keyQualification: 'Not specified',
      coursesInquired: [],
      feesDiscussed: 'None',
      callbackPreference: 'Not requested',
      sentiment: 'neutral',
      actionItems: ['Follow up via SMS'],
    };
  }

  const prompt = `You are an Admissions Intelligence Specialist for Assam Down Town University (AdtU).
Analyze the following university career counselling call transcript with lead "${leadName || 'Prospect'}".

Generate a structured summary in STRICT JSON format with NO markdown wrapping or extra text. Use exact JSON format:
{
  "summaryText": "2-3 concise sentences summarizing the call outcome, student profile, and course interest.",
  "keyQualification": "Current education level (e.g. 10+2 PCM 50%, BCA 7th sem, B.Sc Nursing, 12th Commerce)",
  "coursesInquired": ["List of courses discussed e.g. B.Tech CSE, MBA, MCA"],
  "feesDiscussed": "Brief note on fee structures or eligibility queries answered",
  "callbackPreference": "Best callback time or WhatsApp contact mentioned",
  "sentiment": "interested", // choose from: enthusiastic, interested, neutral, hesitant, uninterested
  "actionItems": ["List of next steps for AdtU admissions counselor e.g. Send B.Tech CSE brochure on WhatsApp"]
}

TRANSCRIPT:
${transcript.slice(-4000)}`;

  let lastError: any = null;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const apiKey = keys[keyIndex % keys.length];
    keyIndex++;

    try {
      // Try gemini-1.5-flash or gemini-2.0-flash endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
          },
        },
        { timeout: 12000 }
      );

      const candidateText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.info(`✨ Gemini 3.6 Flash summary generated for ${leadName || 'Lead'}`);
        return {
          summaryText: parsed.summaryText || 'Call completed.',
          keyQualification: parsed.keyQualification || 'Not specified',
          coursesInquired: Array.isArray(parsed.coursesInquired) ? parsed.coursesInquired : [],
          feesDiscussed: parsed.feesDiscussed || 'None',
          callbackPreference: parsed.callbackPreference || 'None',
          sentiment: ['enthusiastic', 'interested', 'neutral', 'hesitant', 'uninterested'].includes(parsed.sentiment) ? parsed.sentiment : 'interested',
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        };
      }
    } catch (err: any) {
      lastError = err;
      if (err.response?.status === 429) {
        logger.warn(`⚠️ Gemini key ${attempt + 1}/${keys.length} rate limited — rotating to next key...`);
        continue;
      }
      logger.warn(`⚠️ Gemini API error (attempt ${attempt + 1}): ${err?.message?.slice(0, 100)}`);
    }
  }

  logger.error(`❌ Gemini summary failed after all key rotations: ${lastError?.message || 'unknown error'}`);
  return {
    summaryText: 'AdtU counseling call completed. Automated summary unavailable.',
    keyQualification: 'Not specified',
    coursesInquired: [],
    feesDiscussed: 'None',
    callbackPreference: 'Follow up',
    sentiment: 'neutral',
    actionItems: ['Counselor to review raw transcript'],
  };
}
