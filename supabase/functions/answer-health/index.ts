import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const maxBodyBytes = 8_000;
const maxQuestionLength = 500;
const maxAnswerFieldLength = 2_000;
const consentVersion = "groq-health-v1";

function containsLikelyPersonalInformation(value: string) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
    || /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(value)
    || /\b\d{3}-\d{2}-\d{4}\b/.test(value)
    || /\b(?:date of birth|dob|birth date|medical record|patient id|account number|member id|policy number|claim number|home address|street address|my name is|i work at|my employer is)\b/i.test(value);
}

const responseShape = {
  title: "A short, reassuring title specific to the question",
  summary: "A direct plain-language answer that acknowledges uncertainty",
  points: ["Three practical, safe next steps tailored to the question"],
  next: "Specific emergency warning signs and when to seek urgent care",
  consider: "One useful detail the person should track or tell a clinician",
  clinicianType: "The most appropriate type of healthcare professional to contact",
  followUps: [{ question: "A focused follow-up question", answer: "A useful answer to that follow-up" }],
};

function deidentifyQuestion(value: string) {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email removed]")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[phone removed]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[identifier removed]")
    .replace(/\b\d{5}(?:-\d{4})?\b/g, "[postal code removed]")
    .replace(/\b(?:mrn|medical record(?: number)?|patient id|account number|member id|policy number|claim number)\s*[:#-]?\s*[A-Z0-9-]+\b/gi, "[medical identifier removed]")
    .replace(/\b(?:date of birth|dob|birth date)\s*[:#-]?\s*[^,.;\n]+/gi, "[date of birth removed]")
    .replace(/\b(?:my name is|name)\s*[:#-]?\s*[A-Za-z][A-Za-z' -]{1,60}/gi, "[name removed]")
    .replace(/\b(?:home|street|mailing|residential) address\s*[:#-]?\s*[^,.;\n]+/gi, "[address removed]")
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.' -]+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way)\b[^,.;\n]*/gi, "[address removed]")
    .replace(/\b(?:i work at|my employer is|employer|company)\s*[:#-]?\s*[^,.;\n]+/gi, "[employer removed]")
    .replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, "[date removed]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fallbackAnswer(question: string) {
  const normalized = question.toLowerCase();
  const clinicianType = normalized.includes("medicine") || normalized.includes("medication") || normalized.includes("pill")
    ? "pharmacist"
    : normalized.includes("rash") || normalized.includes("skin") || normalized.includes("itch")
      ? "primary-care clinician or dermatologist"
      : normalized.includes("anxiety") || normalized.includes("depress") || normalized.includes("stress")
        ? "primary-care clinician or therapist"
        : normalized.includes("child") || normalized.includes("baby") || normalized.includes("infant")
          ? "pediatrician"
          : "primary-care clinician";

  return {
    source: "fallback",
    title: `A clear next step for: ${question}`,
    summary: `You asked about “${question}.” The safest answer depends on details such as when it started, how severe it is, what makes it better or worse, your age, medicines, and medical history. Start by recording those details so the guidance fits your situation rather than treating a general answer as a diagnosis.`,
    points: [
      `Track the timing, severity, related symptoms, and anything that changed before or after ${question.toLowerCase()}.`,
      `Use only low-risk comfort measures that fit your symptoms, and check with a ${clinicianType} before starting, stopping, or combining medicines.`,
      `Arrange a conversation with a ${clinicianType} if this persists, worsens, keeps returning, or interferes with normal activities.`,
    ],
    next: "Seek emergency services now for trouble breathing, chest pain, fainting, confusion, sudden weakness, severe bleeding, or rapidly worsening symptoms.",
    consider: `What is the most important detail about “${question}”: when it began, how bad it is, or what other symptom appeared with it?`,
    clinicianType,
    followUps: [
      { question: "What details would make the answer more specific?", answer: "Share your age group, when this started, severity, related symptoms, medicines, relevant conditions, and whether it is improving or worsening." },
      { question: "When should I get checked?", answer: `Contact a ${clinicianType} if the concern persists, worsens, recurs, or affects daily life. Use emergency services for severe or rapidly worsening symptoms.` },
    ],
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST for health questions." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return jsonResponse({ error: "Sign in to ask a health question." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Your session is invalid or has expired." }, 401);

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > maxBodyBytes) return jsonResponse({ error: "The request is too large." }, 413);
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) return jsonResponse({ error: "Send the question as JSON." }, 415);
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) return jsonResponse({ error: "The request is too large." }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "The request body is not valid JSON." }, 400);
    }
    if (body.privacyConsent !== true || body.privacyConsentVersion !== consentVersion) return jsonResponse({ error: "Current privacy consent is required before using the external AI provider." }, 400);

    const submittedQuestion = typeof body.question === "string" ? body.question.trim() : "";
    if (!submittedQuestion || submittedQuestion.length > maxQuestionLength) return jsonResponse({ error: "Please provide a question up to 500 characters." }, 400);
    if (containsLikelyPersonalInformation(submittedQuestion)) return jsonResponse({ error: "For your privacy, remove names, contact details, record numbers, dates of birth, addresses, employer details, or other identifying information before sending this question." }, 400);
    const question = deidentifyQuestion(submittedQuestion);

    const configuredApiKey = Deno.env.get("GROQ_API_KEY")?.trim();
    const apiKey = configuredApiKey?.replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "");
    if (!apiKey) {
      console.warn("[answer-health] GROQ_API_KEY is not configured; returning a safe tailored fallback");
      return jsonResponse(fallbackAnswer(question));
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are Clarity, a careful health education assistant. Give a direct answer tailored to the exact question, but never diagnose, prescribe, or pretend to know missing personal details. Ask focused follow-up questions when the answer depends on age, pregnancy, medicines, duration, severity, or medical history. Include practical self-care only when generally safe. Always include urgent warning signs, a clear clinician disclaimer, and the most appropriate type of healthcare professional. Be empathetic and concise. The user question has been server-side de-identified. Do not try to infer or reconstruct removed personal information. Return valid JSON matching this shape exactly: ${JSON.stringify(responseShape)}. Include exactly three points and two followUps. The next field must mention emergency services for life-threatening symptoms.`,
          },
          { role: "user", content: question },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errorDetails = await groqResponse.text();
      console.error("[answer-health] Groq request failed", { status: groqResponse.status, details: errorDetails.slice(0, 300) });
      return jsonResponse(fallbackAnswer(question));
    }

    const completion = await groqResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("The answer service returned no content");
    const answer = JSON.parse(content);
    const isBoundedString = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= maxAnswerFieldLength;
    const hasValidFollowUp = (value: unknown): value is { question: string; answer: string } => Boolean(value && typeof value === "object" && isBoundedString((value as { question?: unknown }).question) && isBoundedString((value as { answer?: unknown }).answer));
    if (!answer || typeof answer !== "object" || !isBoundedString(answer.title) || !isBoundedString(answer.summary) || !Array.isArray(answer.points) || answer.points.length !== 3 || !answer.points.every(isBoundedString) || !isBoundedString(answer.next) || !isBoundedString(answer.consider) || !isBoundedString(answer.clinicianType) || !Array.isArray(answer.followUps) || answer.followUps.length !== 2 || !answer.followUps.every(hasValidFollowUp)) throw new Error("The answer service returned an invalid response shape");
    return jsonResponse({ ...answer, source: "ai" });
  } catch (error) {
    console.error("[answer-health] Failed to create answer", { error });
    return jsonResponse({ error: "The answer service is temporarily unavailable." }, 500);
  }
});
