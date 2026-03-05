/**
 * AI Service — stub interface.
 *
 * Currently uses offline heuristic parser + simulated enhancements.
 *
 * ─── TO CONNECT A REAL LLM (e.g. Claude/OpenAI) ─────────────────────────────
 *
 * 1. Install the SDK: `npm install @anthropic-ai/sdk` or `npm install openai`
 *
 * 2. Replace the bodies of `parseAvailabilityWithAI` and `refineProposalsWithAI`
 *    with actual API calls, using the prompts below as guidance.
 *
 * 3. Add your API key to a .env file: VITE_CLAUDE_API_KEY=sk-ant-...
 *    (Note: for production, proxy API calls through a backend to protect the key.)
 *
 * Example Claude integration:
 * ```ts
 * import Anthropic from '@anthropic-ai/sdk';
 * const client = new Anthropic({ apiKey: import.meta.env.VITE_CLAUDE_API_KEY });
 *
 * const message = await client.messages.create({
 *   model: 'claude-opus-4-6',
 *   max_tokens: 1024,
 *   messages: [{
 *     role: 'user',
 *     content: PARSE_PROMPT + text,
 *   }],
 * });
 * // Parse JSON from message.content[0].text
 * ```
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Availability, Proposal } from '../types';
import { parseAvailability } from './parser';

export const PARSE_AVAILABILITY_PROMPT = `
Jesteś asystentem korepetytora. Przeanalizuj poniższą wiadomość od ucznia i wyodrębnij
strukturę dostępności w formacie JSON zgodnym z typem Availability:

{
  timezone: "Europe/Warsaw",
  windows: [{
    dayOfWeek?: number,  // 0=Nd, 1=Pon, ..., 6=Sb
    date?: string,       // YYYY-MM-DD jeśli konkretna data
    startTime: string,   // HH:mm
    endTime: string,
    preference?: "preferred" | "ok" | "avoid"
  }],
  constraints?: { notBefore?: string, notAfter?: string, minBreakMin?: number },
  durationMin?: number,
  weekOffset?: number  // 0=bieżący tydzień, 1=przyszły
}

Wiadomość ucznia:
`.trim();

// ─── Main exported functions ──────────────────────────────────────────────────

/**
 * Parse a student's availability message.
 *
 * In stub mode: uses offline heuristic parser + simulated latency.
 * Production: replace with real API call using PARSE_AVAILABILITY_PROMPT.
 */
export async function parseAvailabilityWithAI(
  text: string,
): Promise<{ availability: Availability; isAI: boolean; processingNote: string }> {
  // Simulate a short processing delay (makes UX feel more "AI-like")
  await delay(500);

  const availability = parseAvailability(text);

  // Stub: simulate AI "enhancements" — add inferred constraints
  const enhanced = applyStubEnhancements(availability, text);

  return {
    availability: enhanced,
    isAI: false,
    processingNote:
      'Analiza heurystyczna (offline). Podłącz klucz API, aby użyć AI.',
  };
}

/**
 * Optionally refine proposals using AI context.
 *
 * In stub mode: returns proposals unchanged with a human-readable label.
 * Production: could ask the LLM to re-rank or explain proposals in natural language.
 */
export async function refineProposalsWithAI(
  proposals: Proposal[],
  studentMessage: string,
  studentName: string,
): Promise<{ proposals: Proposal[]; summary: string }> {
  await delay(200);

  if (proposals.length === 0) {
    return {
      proposals,
      summary: `Nie udało się znaleźć wolnych terminów pasujących do wiadomości ${studentName}.`,
    };
  }

  // Stub: generate a simple natural language summary
  const best = proposals[0];
  const summary = `Znaleziono ${proposals.length} propozycji dla ${studentName}. Najlepszy termin: ${formatProposalSummary(best)}.`;

  return { proposals, summary };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function applyStubEnhancements(
  availability: Availability,
  text: string,
): Availability {
  const enhanced = { ...availability };

  // If no duration found but text mentions "lekcja", default to 60
  if (!enhanced.durationMin && /lekcj[aę]/i.test(text)) {
    enhanced.durationMin = 60;
  }

  // If windows exist but have very wide ranges, narrow them slightly
  enhanced.windows = availability.windows.map((w) => {
    // If someone says "cały dzień" or range > 12h, cap it
    const start = parseInt(w.startTime.split(':')[0], 10);
    const end = parseInt(w.endTime.split(':')[0], 10);
    if (end - start > 10) {
      return { ...w, endTime: '21:00', preference: w.preference ?? 'ok' };
    }
    return w;
  });

  return enhanced;
}

function formatProposalSummary(p: Proposal): string {
  const days = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
  const date = new Date(p.date);
  const dow = days[date.getDay()];
  return `${dow} ${p.date} ${p.startTime}–${p.endTime}`;
}
