import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Crisis Detection ────────────────────────────────────────────────────────

const CRISIS_PHRASES = [
    "suicide",
    "suicidal",
    "kill myself",
    "killing myself",
    "want to die",
    "wanted to die",
    "end my life",
    "ending my life",
    "take my life",
    "taking my life",
    "don't want to live",
    "do not want to live",
    "dont want to live",
    "hurt myself",
    "hurting myself",
    "harm myself",
    "harming myself",
    "self harm",
    "self-harm",
    "cut myself",
    "cutting myself",
    "unalive myself",
    "unalive",
    "planning to die",
    "i should die",
    "i want to disappear forever",
    "i want to kill myself",
    "i am going to kill myself",
    "im going to kill myself",
    "i'm going to kill myself",
    "i've been thinking about suicide",
    "i have been thinking about suicide",
    "thinking about ending it",
    "thinking about ending it all",
    "end it all",
    "not worth living",
    "life is not worth living",
    "life isn't worth living",
    "no reason to live",
    "rather be dead",
    "better off dead",
    "better off without me",
    "everyone would be better off without me",
    "overdose",
    "take all the pills",
    "jump off",
    "hang myself",
];

function detectCrisis(text: string): { isCrisis: boolean; matched: string[] } {
    const lower = text.toLowerCase();
    const matched = CRISIS_PHRASES.filter((phrase) => lower.includes(phrase));
    return { isCrisis: matched.length > 0, matched };
}

// ─── Crisis Response ─────────────────────────────────────────────────────────

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

// ─── Question map ─────────────────────────────────────────────────────────────

const QUESTIONS = [
    { id: "reversible", text: "Is this action reversible?" },
    { id: "emotional", text: "Are you in a heightened emotional state right now?" },
    { id: "slept", text: "Have you slept on this decision?" },
    { id: "deadline", text: "Is there a real deadline forcing your hand?" },
];

// ─── Request validation ───────────────────────────────────────────────────────

function validateRequest(body: unknown): {
    valid: boolean;
    situation?: string;
    answers?: Record<string, boolean>;
    error?: string;
} {
    if (!body || typeof body !== "object") {
        return { valid: false, error: "Invalid request body" };
    }

    const b = body as Record<string, unknown>;

    if (typeof b.situation !== "string" || b.situation.trim().length === 0) {
        return { valid: false, error: "situation is required" };
    }

    if (b.situation.trim().length > 4000) {
        return { valid: false, error: "situation is too long" };
    }

    if (!b.answers || typeof b.answers !== "object") {
        return { valid: false, error: "answers are required" };
    }

    return {
        valid: true,
        situation: b.situation.trim(),
        answers: b.answers as Record<string, boolean>,
    };
}

// ─── Fallback result ──────────────────────────────────────────────────────────

const FALLBACK_RESULT = {
    verdict: "REFLECT",
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

        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { situation, answers } = validation as {
            situation: string;
            answers: Record<string, boolean>;
        };

        // ── Crisis check runs first, always, before any LLM call ──────────────────
        const crisis = detectCrisis(situation);

        if (crisis.isCrisis) {
            return NextResponse.json(buildCrisisResponse(crisis.matched), { status: 200 });
        }

        // ── Build answer summary for the model ────────────────────────────────────
        const answerSummary = QUESTIONS.map(
            (q) => `${q.text} → ${answers[q.id] ? "Yes" : "No"}`
        ).join("\n");

        // ── Call OpenRouter ───────────────────────────────────────────────────────
        const openRouterResponse = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
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
                    max_tokens: 800,
                    messages: [
                        {
                            role: "system",
                            content: `You are a calm, insightful psychological advisor who helps people examine impulsive decisions through psychological frameworks.

Always respond with ONLY valid JSON — no markdown fences, no preamble, no trailing text.

Schema:
{
  "verdict": "ACT" | "WAIT" | "REFLECT",
  "headline": "one punchy sentence, max 12 words, no full stop",
  "biases": array of 1–3 from: ["actionBias", "uncertaintyAvoidance", "distressIntolerance", "cognitiveDissonance"],
  "insight": "2–3 sentences of psychological insight specific to their situation",
  "reframe": "one reframe question starting with 'What if...' or 'Is it possible...'"
}

Rules:
- verdict ACT = evidence suggests acting is fine
- verdict WAIT = evidence suggests waiting would be smarter
- verdict REFLECT = insufficient information or genuinely unclear
- biases must reflect what the answers actually suggest, not a default list
- insight must reference their specific situation, not generic advice
- reframe must feel genuinely thought-provoking, not rhetorical`,
                        },
                        {
                            role: "user",
                            content: `Situation: "${situation}"\n\nAnswers:\n${answerSummary}`,
                        },
                    ],
                }),
            }
        );

        if (!openRouterResponse.ok) {
            console.error(
                "OpenRouter error:",
                openRouterResponse.status,
                await openRouterResponse.text()
            );
            return NextResponse.json(FALLBACK_RESULT, { status: 200 });
        }

        const data = await openRouterResponse.json();
        const rawText: string = data.choices?.[0]?.message?.content ?? "";

        // ── Parse JSON from model output ──────────────────────────────────────────
        const cleaned = rawText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        let parsed: Record<string, unknown>;

        try {
            parsed = JSON.parse(cleaned);
        } catch {
            console.error("JSON parse failed:", cleaned);
            return NextResponse.json(FALLBACK_RESULT, { status: 200 });
        }

        // ── Validate model output shape ───────────────────────────────────────────
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

        const result = {
            verdict,
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
        };

        return NextResponse.json(result, { status: 200 });
    } catch (err) {
        console.error("Route error:", err);
        return NextResponse.json(FALLBACK_RESULT, { status: 200 });
    }
}