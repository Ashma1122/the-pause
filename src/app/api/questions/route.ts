import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Crisis Detection ────────────────────────────────────────────────────────

const CRISIS_PHRASES = [
    "suicide", "suicidal", "kill myself", "killing myself", "want to die",
    "wanted to die", "end my life", "ending my life", "take my life",
    "taking my life", "don't want to live", "do not want to live", "dont want to live",
    "hurt myself", "hurting myself", "harm myself", "harming myself",
    "self harm", "self-harm", "cut myself", "cutting myself",
    "unalive myself", "unalive", "planning to die", "i should die",
    "i want to disappear forever", "i want to kill myself",
    "i am going to kill myself", "im going to kill myself", "i'm going to kill myself",
    "i've been thinking about suicide", "i have been thinking about suicide",
    "thinking about ending it", "thinking about ending it all", "end it all",
    "not worth living", "life is not worth living", "life isn't worth living",
    "no reason to live", "rather be dead", "better off dead", "better off without me",
    "everyone would be better off without me", "overdose", "take all the pills",
    "jump off", "hang myself",
];

function detectCrisis(text: string): { isCrisis: boolean; matched: string[] } {
    const lower = text.toLowerCase();
    const matched = CRISIS_PHRASES.filter((phrase) => lower.includes(phrase));
    return { isCrisis: matched.length > 0, matched };
}

function buildCrisisResponse(matched: string[]) {
    return {
        mode: "CRISIS",
        headline: "This is bigger than a decision. You deserve real support right now.",
        message:
            "What you wrote suggests you may be thinking about suicide or harming yourself. This tool isn't built for that — a real human is. Please reach out to someone who can actually help you through this moment.",
        actions: [
            "If you are in immediate danger, call your local emergency number now (UAE: 998, UK: 999, US/Canada: 911)",
            "Call or text a crisis line — UAE: 800-HOPE (4673), US/Canada: 988, International: findahelpline.com",
            "Go to the nearest emergency department if you think you may act soon",
            "Tell someone you trust where you are and how you are feeling right now",
            "Stay with another person — don't be alone if you can avoid it",
        ],
        support: {
            uae: "800-HOPE (4673) — Emirates Health Services, free 24/7",
            usCanada: "Call or text 988 — free, confidential, 24/7",
            international: "findahelpline.com — crisis lines for every country",
            emergency: "Call local emergency services if you may act soon",
        },
        matched,
    };
}

// ─── Request validation ───────────────────────────────────────────────────────

function validateRequest(body: unknown): {
    valid: boolean;
    situation?: string;
    answers?: Record<string, boolean>;
    questions?: Array<{ id: string; text: string }>;
    error?: string;
} {
    if (!body || typeof body !== "object") return { valid: false, error: "Invalid request body" };
    const b = body as Record<string, unknown>;
    if (typeof b.situation !== "string" || b.situation.trim().length === 0)
        return { valid: false, error: "situation is required" };
    if (b.situation.trim().length > 4000) return { valid: false, error: "situation is too long" };
    if (!b.answers || typeof b.answers !== "object") return { valid: false, error: "answers are required" };
    return {
        valid: true,
        situation: b.situation.trim(),
        answers: b.answers as Record<string, boolean>,
        questions: Array.isArray(b.questions) ? b.questions as Array<{ id: string; text: string }> : [],
    };
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

const FALLBACK_RESULT = {
    verdict: "REFLECT",
    condition: "Take 24 hours before deciding",
    timeframe: "24 hours",
    headline: "Something felt urgent enough to examine.",
    biases: ["actionBias"],
    insight:
        "The fact that you paused to think about this already shows awareness. That instinct — to stop and question yourself — is worth trusting.",
    reframe: "What would you tell a close friend who came to you with this exact situation?",
};

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = validateRequest(body);
        if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

        const { situation, answers, questions } = validation as {
            situation: string;
            answers: Record<string, boolean>;
            questions: Array<{ id: string; text: string }>;
        };

        const crisis = detectCrisis(situation);
        if (crisis.isCrisis) return NextResponse.json(buildCrisisResponse(crisis.matched), { status: 200 });

        // Build answer summary using the adaptive questions passed from the client
        const answerSummary =
            questions.length > 0
                ? questions.map((q) => `${q.text} → ${answers[q.id] ? "Yes" : "No"}`).join("\n")
                : Object.entries(answers)
                    .map(([k, v]) => `${k}: ${v ? "Yes" : "No"}`)
                    .join("\n");

        const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "The Pause",
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                temperature: 0.7,
                max_tokens: 900,
                messages: [
                    {
                        role: "system",
                        content: `You are a calm, insightful psychological advisor helping people examine impulsive decisions.

Respond ONLY with valid JSON — no markdown fences, no preamble, no trailing text.

Schema:
{
  "verdict": "ACT" | "WAIT" | "REFLECT",
  "condition": "specific actionable condition — what to do or what must be true first. Max 10 words.",
  "timeframe": "specific time window if verdict is WAIT, e.g. 'until tomorrow morning', '48 hours', 'after the weekend'. null if ACT.",
  "headline": "one punchy sentence, max 12 words, no full stop",
  "biases": array of 1–3 from: ["actionBias", "uncertaintyAvoidance", "distressIntolerance", "cognitiveDissonance"],
  "insight": "2–3 sentences of psychological insight specific to their situation",
  "reframe": "one reframe question starting with 'What if...' or 'Is it possible...'"
}

Rules:
- verdict ACT = evidence suggests acting is fine. condition = what to check or do first.
- verdict WAIT = waiting is smarter. condition = what must change or happen first. timeframe = specific window.
- verdict REFLECT = genuinely unclear. condition = what information or clarity is needed first.
- Never give a verdict without a specific condition. "Just wait" is not a condition.
- biases must reflect the actual answers, not defaults
- insight must reference their specific situation
- reframe must feel genuinely thought-provoking`,
                    },
                    {
                        role: "user",
                        content: `Situation: "${situation}"\n\nAnswers:\n${answerSummary}`,
                    },
                ],
            }),
        });

        if (!openRouterResponse.ok) return NextResponse.json(FALLBACK_RESULT, { status: 200 });

        const data = await openRouterResponse.json();
        const rawText: string = data.choices?.[0]?.message?.content ?? "";
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            return NextResponse.json(FALLBACK_RESULT, { status: 200 });
        }

        const allowedVerdicts = ["ACT", "WAIT", "REFLECT"];
        const allowedBiases = [
            "actionBias",
            "uncertaintyAvoidance",
            "distressIntolerance",
            "cognitiveDissonance",
        ];

        const verdict = allowedVerdicts.includes(parsed.verdict as string)
            ? (parsed.verdict as string)
            : "REFLECT";

        const biases = Array.isArray(parsed.biases)
            ? (parsed.biases as string[]).filter((b) => allowedBiases.includes(b)).slice(0, 3)
            : ["actionBias"];

        return NextResponse.json(
            {
                verdict,
                condition:
                    typeof parsed.condition === "string" && parsed.condition.length > 0
                        ? parsed.condition
                        : FALLBACK_RESULT.condition,
                timeframe:
                    typeof parsed.timeframe === "string" && parsed.timeframe.length > 0
                        ? parsed.timeframe
                        : null,
                headline:
                    typeof parsed.headline === "string" && parsed.headline.length > 0
                        ? parsed.headline
                        : FALLBACK_RESULT.headline,
                biases: biases.length > 0 ? biases : ["actionBias"],
                insight:
                    typeof parsed.insight === "string" && parsed.insight.length > 0
                        ? parsed.insight
                        : FALLBACK_RESULT.insight,
                reframe:
                    typeof parsed.reframe === "string" && parsed.reframe.length > 0
                        ? parsed.reframe
                        : FALLBACK_RESULT.reframe,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error("Route error:", err);
        return NextResponse.json(FALLBACK_RESULT, { status: 200 });
    }
}