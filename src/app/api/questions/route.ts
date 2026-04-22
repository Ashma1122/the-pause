import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_QUESTIONS = [
    { id: "reversible", text: "Is this action reversible?" },
    { id: "emotional", text: "Are you in a heightened emotional state right now?" },
    { id: "slept", text: "Have you slept on this decision?" },
    { id: "deadline", text: "Is there a real deadline forcing your hand?" },
];

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("questions body:", body);

        const situation = typeof body?.situation === "string" ? body.situation.trim() : "";
        if (!situation) {
            return NextResponse.json({ error: "situation is required" }, { status: 400 });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "The Pause",
            },
            body: JSON.stringify({
                model: "openrouter/auto",
                temperature: 0.5,
                max_tokens: 400,
                messages: [
                    {
                        role: "system",
                        content: `Generate 4 yes/no diagnostic questions tailored to the specific situation described. Cover: emotional state, reversibility, urgency, and readiness — but worded specifically to their context.

Respond ONLY with valid JSON, no markdown:
{"questions":[{"id":"q1","text":"question?"},{"id":"q2","text":"question?"},{"id":"q3","text":"question?"},{"id":"q4","text":"question?"}]}

Rules: each question max 12 words, answerable yes or no, specific to the situation.`,
                    },
                    { role: "user", content: `Situation: "${situation}"` },
                ],
            }),
        });

        if (!response.ok) return NextResponse.json({ questions: FALLBACK_QUESTIONS });

        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content ?? "";
        const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

        try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed.questions) && parsed.questions.length === 4) {
                return NextResponse.json({ questions: parsed.questions });
            }
        } catch { }

        return NextResponse.json({ questions: FALLBACK_QUESTIONS });
    } catch {
        return NextResponse.json({ questions: FALLBACK_QUESTIONS });
    }
}