import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseShape = {
  title: "A short, reassuring title specific to the question",
  summary: "A direct plain-language answer that acknowledges uncertainty",
  points: ["Three practical, safe next steps tailored to the question"],
  next: "Specific emergency warning signs and when to seek urgent care",
  consider: "One useful detail the person should track or tell a clinician",
  clinicianType: "The most appropriate type of healthcare professional to contact",
  followUps: [{ question: "A focused follow-up question", answer: "A useful answer to that follow-up" }],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST for health questions." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI answer service is not configured." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question || question.length > 500) {
      return new Response(JSON.stringify({ error: "Please provide a question up to 500 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Answer this health question: ${question}`;
    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are Clarity, a careful health education assistant. Give a direct answer tailored to the exact question, but never diagnose, prescribe, or pretend to know missing personal details. Ask focused follow-up questions when the answer depends on age, pregnancy, medicines, duration, severity, or medical history. Include practical self-care only when generally safe. Always include urgent warning signs, a clear clinician disclaimer, and the most appropriate type of healthcare professional (for example pharmacist, primary-care clinician, dermatologist, therapist, pediatrician, or emergency clinician). Be empathetic and concise. Return valid JSON matching this shape exactly: ${JSON.stringify(responseShape)}. Include exactly three points and two followUps. The next field must mention emergency services for life-threatening symptoms.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      console.error("[answer-health] OpenAI request failed", { status: openAiResponse.status });
      return new Response(JSON.stringify({ error: "The answer service is temporarily unavailable." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await openAiResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("The answer service returned no content");

    const answer = JSON.parse(content);
    return new Response(JSON.stringify(answer), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[answer-health] Failed to create answer", { error });
    return new Response(JSON.stringify({ error: "The answer service is temporarily unavailable." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
