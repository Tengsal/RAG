// Career Counselling — Groq LLM plugin with Tool Calling Engine (AdtU Course Fees & Call Transfer)
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export const ADTU_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'query_course_fees_eligibility',
      description: 'Search exact fee structure, eligibility criteria, course duration, and specializations for any UG or PG course offered by Assam Down Town University (AdtU). USE THIS whenever the caller asks about fees, cost, percentage requirements, or course details.',
      parameters: {
        type: 'object',
        properties: {
          course_name: {
            type: 'string',
            description: 'Name of the course e.g. B.Tech CSE, MCA, MBA, B.Pharm, B.Sc Nursing, BCA, BBA, BMLT',
          },
          degree_level: {
            type: 'string',
            enum: ['UG', 'PG', 'Any'],
            description: 'Degree level: UG for undergraduate, PG for postgraduate',
          },
        },
        required: ['course_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'transfer_call',
      description: 'Transfer the live phone call to a human senior admissions counsellor. USE THIS ONLY when the caller explicitly asks to speak with a human, senior counselor, office representative, or demands direct phone transfer.',
      parameters: {
        type: 'object',
        properties: {
          transfer_number: {
            type: 'string',
            description: 'Target phone number for call transfer (default: +919678926411)',
          },
          reason: {
            type: 'string',
            description: 'Reason for call transfer e.g. Direct human counselor requested',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'query_university_info',
      description:
        'Search Assam Down Town University information including administration, Vice Chancellor, Registrar, committees, scholarships, attendance rules, admissions, academic calendar, library, hostel, transport, student services, facilities, and university policies. USE THIS whenever the caller asks about general university information that is not specifically about course fees or course eligibility.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description:
              'The complete university information question or topic from the caller, for example: who is the Vice Chancellor, who is Dr Sangita Boro, anti-ragging committee, attendance requirement, scholarships, library, hostel, admission documents',
          },
        },
        required: ['topic'],
      },
    },
  },
];

export const createGroqLLM = (config: any) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set in environment');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const envDefault = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  let model = config.model || envDefault;

  function isReasoningModel(m: string): boolean {
    return /gpt-oss|gpt-5|^o[0-9]|reasoning/i.test(m);
  }

  function buildParams(msgs: ChatMessage[], currentModel: string, withTools: boolean, tools?: any[], requestOptions?: { temperature?: number; maxTokens?: number }) {
    const isReasoning = isReasoningModel(currentModel);

    const temperature = requestOptions?.temperature ?? (isReasoning ? 1 : (config.temperature ?? 0.6));
    const topP = config.top_p ?? parseFloat(process.env.GROQ_TOP_P ?? '1');

    const params: any = {
      model: currentModel,
      messages: msgs,
      temperature,
      top_p: topP,
      stream: true,
    };

    if (withTools && tools && tools.length > 0) {
      params.tools = tools;
      params.tool_choice = 'auto';
    }

    if (isReasoning) {
      params.max_completion_tokens =
        requestOptions?.maxTokens ?? config.max_completion_tokens ??
        parseInt(process.env.GROQ_MAX_COMPLETION_TOKENS ?? '2048');
      const effort = config.reasoning_effort ?? process.env.GROQ_REASONING_EFFORT ?? 'medium';
      if (effort) params.reasoning_effort = effort;
    } else {
      params.max_tokens = requestOptions?.maxTokens ?? config.max_completion_tokens ?? 180;
      params.stop = ['\n\n', 'CALLER:', 'User:', 'Customer:'];
    }
    return params;
  }

  logger.info(
    `🧠 Groq LLM initialised: model=${model}` +
      (isReasoningModel(model) ? ` (reasoning, effort=${process.env.GROQ_REASONING_EFFORT || 'medium'})` : ' (non-reasoning, fast path)'),
  );

  return {
    model,

    generateStream: async function* (messages: ChatMessage[], signal?: AbortSignal, tools: any[] = ADTU_TOOLS, diagnostic?: { turnId?: string }, requestOptions?: { temperature?: number; maxTokens?: number }) {
      const requestStartedAt = Date.now();
      let firstTokenLogged = false;
      logger.info(`🧠 Groq request — model=${model}, turns=${messages.length}, tools=${tools?.length || 0}`);

      const createStreamWithRetry = async (): Promise<any> => {
        const params = buildParams(messages, model, !!tools?.length, tools, requestOptions);
        try {
          return await client.chat.completions.create(params as any, { signal });
        } catch (err: any) {
          // 404 model_not_found → fallback to env default
          if ((err?.status === 404 || err?.code === 'model_not_found') && model !== envDefault) {
            logger.warn(`⚠️ Model "${model}" not found (404) → falling back to env default "${envDefault}"`);
            model = envDefault;
            const fallbackParams = buildParams(messages, model, !!tools?.length, tools, requestOptions);
            return await client.chat.completions.create(fallbackParams as any, { signal });
          }

          // Recovery for gpt-oss tool_use_failed error
          const errCode = err?.code || err?.error?.code;
          if (errCode === 'tool_use_failed' && err?.error?.failed_generation) {
            const failedGen = String(err.error.failed_generation);
            const match = failedGen.match(/"arguments":\s*"?([^"}]+)"?/);
            if (match && match[1]) {
              const recoveredText = match[1].replace(/<\|channel\|>\w*/g, '').trim();
              if (recoveredText) {
                logger.info(`💡 Recovered text from gpt-oss tool_use_failed: "${recoveredText}"`);
                return (async function* () {
                  yield { choices: [{ delta: { content: recoveredText } }] };
                })();
              }
            }
          }

          // 429 rate limit → wait and retry
          if (err?.status === 429 || err?.code === 'rate_limit_exceeded') {
            const retryMatch = err?.message?.match(/try again in ([\d.]+)s/);
            const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500 : 2500;
            logger.warn(`🧠 Groq 429 rate limit — retrying in ${waitMs}ms...`);
            await new Promise(r => setTimeout(r, waitMs));
            if (signal?.aborted) throw err;
            const retryParams = buildParams(messages, model, !!tools?.length, tools, requestOptions);
            return await client.chat.completions.create(retryParams as any, { signal });
          }
          throw err;
        }
      };

      try {
        const stream = await createStreamWithRetry();
        logger.info(`[LLM] GROQ_STREAM_OPENED | model=${model} | turns=${messages.length}`);

        let totalChars = 0;
        let contentAccumulator = '';

        // Tool call accumulator
        let toolCallId = '';
        let toolName = '';
        let toolArgsBuffer = '';

        for await (const chunk of stream) {
          if (signal?.aborted) {
            logger.info(`🧠 Groq stream aborted by user`);
            break;
          }

          const delta = chunk.choices[0]?.delta;

          // Check if LLM emitted a tool call
          if (delta?.tool_calls && delta.tool_calls.length > 0) {
            const tc = delta.tool_calls[0];
            if (tc.id) toolCallId = tc.id;
            if (tc.function?.name) toolName = tc.function.name;
            if (tc.function?.arguments) toolArgsBuffer += tc.function.arguments;
            logger.info(`[LLM] TOOL_CALL_CHUNK | toolName=${tc.function?.name || toolName} | argsBuffer=${toolArgsBuffer.substring(0, 50)}`);
          }

          const content = delta?.content || '';
          if (content) {
            if (!firstTokenLogged) {
              firstTokenLogged = true;
              logger.info(`[LLM] FIRST_TOKEN | turnId=${diagnostic?.turnId || 'unknown'} | latencyMs=${Date.now() - requestStartedAt}`);
            }
            contentAccumulator += content;
            if (/<|<f|<fu|<fun|<func|<funct|<functi|<functio|<function|<function=$/i.test(contentAccumulator)) {
              continue;
            }
            if (contentAccumulator.length > 0) {
              totalChars += contentAccumulator.length;
              yield { type: 'content', content: contentAccumulator };
              contentAccumulator = '';
            }
          }
        }

        if (contentAccumulator.length > 0) {
          totalChars += contentAccumulator.length;
          yield { type: 'content', content: contentAccumulator };
        }

        // Emit tool call if collected
        if (toolName && toolArgsBuffer) {
          logger.info(`[LLM] TOOL_CALL_EMITTED | toolName=${toolName} | args=${toolArgsBuffer.substring(0, 100)}`);
          logger.info(`🛠️ LLM Tool Call emitted: ${toolName}(${toolArgsBuffer})`);
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(toolArgsBuffer);
          } catch (_) {}
          yield {
            type: 'tool_call',
            toolCallId: toolCallId || `call_${Date.now()}`,
            toolName,
            args: parsedArgs,
          };
        }

        logger.info(`[LLM] GENERATION_COMPLETE | turnId=${diagnostic?.turnId || 'unknown'} | chars=${totalChars} | durationMs=${Date.now() - requestStartedAt}`);
        logger.info(`🧠 Groq stream complete — ${totalChars} chars`);
      } catch (error: any) {
        if (error.name === 'AbortError' || signal?.aborted) {
          logger.warn(`[LLM] STREAM_ABORTED_BY_SIGNAL`);
          logger.info(`🧠 Groq request aborted mid-flight.`);
        } else {
          logger.error(`🧠 Groq generation error:`, error);
          throw error;
        }
      }
    },
  };
};
