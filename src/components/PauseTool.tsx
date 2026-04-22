"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question { id: string; text: string; }

interface Session {
  id: string;
  situation: string;
  verdict: string;
  condition: string;
  timeframe: string | null;
  timestamp: number;
  followedUp: boolean;
  outcome: "acted" | "waited" | null;
  outcomeNote: string | null;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "the-pause-sessions";

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: Session[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch { }
}

function addSession(session: Session) {
  const sessions = loadSessions();
  sessions.unshift(session);
  saveSessions(sessions.slice(0, 20)); // keep last 20
}

function updateSession(id: string, patch: Partial<Session>) {
  const sessions = loadSessions();
  const updated = sessions.map(s => s.id === id ? { ...s, ...patch } : s);
  saveSessions(updated);
}

function getPendingFollowUps(): Session[] {
  const sessions = loadSessions();
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  return sessions.filter(s => !s.followedUp && s.timestamp < twentyFourHoursAgo);
}

// ─── Bias map ─────────────────────────────────────────────────────────────────

const BIAS_MAP: Record<string, string> = {
  actionBias: "Action Bias — your brain prefers doing over waiting, even when waiting is smarter.",
  uncertaintyAvoidance: "Uncertainty Avoidance — you're trying to resolve the discomfort of not knowing.",
  distressIntolerance: "Distress Intolerance — the anxiety of waiting feels worse than a bad outcome.",
  cognitiveDissonance: "Cognitive Dissonance — you're acting to resolve conflicting thoughts, not because it's right.",
};

// ─── Crisis Screen ────────────────────────────────────────────────────────────

function CrisisScreen({ data }: { data: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.5s ease" }}>
      <div style={{ background: "#2a0a0a", border: "1px solid #cc3333", borderRadius: "12px", padding: "24px" }}>
        <div style={{ color: "#ff6666", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", marginBottom: "10px" }}>PLEASE READ THIS</div>
        <p style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "20px", lineHeight: 1.4, margin: 0 }}>{data.headline}</p>
      </div>
      <p style={{ color: "#c8a87a", fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>{data.message}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "4px" }}>WHAT TO DO RIGHT NOW</div>
        {data.actions?.map((action: string, i: number) => (
          <div key={i} style={{ background: "#1a1008", border: "1px solid #3a1a1a", borderRadius: "8px", padding: "12px 16px", color: "#d4c0a0", fontFamily: "'Georgia', serif", fontSize: "14px", lineHeight: 1.5, display: "flex", gap: "12px" }}>
            <span style={{ color: "#cc3333" }}>→</span>{action}
          </div>
        ))}
      </div>
      <div style={{ background: "#1a0808", border: "1px solid #4a1a1a", borderRadius: "10px", padding: "20px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "12px" }}>CRISIS LINES</div>
        {Object.values(data.support || {}).map((val, i) => (
          <div key={i} style={{ color: "#c8a87a", fontFamily: "'Georgia', serif", fontSize: "14px", marginBottom: "6px" }}>{String(val)}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Breathing Orb ────────────────────────────────────────────────────────────

function BreathingOrb({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div style={{
        width: 120, height: 120, borderRadius: "50%",
        background: "radial-gradient(circle at 40% 40%, #f5c97a, #c97d2a)",
        boxShadow: active ? "0 0 60px 20px rgba(245,201,122,0.3), 0 0 120px 40px rgba(201,125,42,0.15)" : "0 0 20px 4px rgba(245,201,122,0.1)",
        animation: active ? "breathe 4s ease-in-out infinite" : "none",
        transition: "box-shadow 1s ease",
      }} />
      {active && <p style={{ color: "#f5c97a", fontSize: "13px", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace", opacity: 0.7 }}>breathe with it</p>}
      <style>{`@keyframes breathe { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.35);opacity:1} }`}</style>
    </div>
  );
}

// ─── Follow-up Banner ─────────────────────────────────────────────────────────

function FollowUpBanner({ session, onComplete }: { session: Session; onComplete: () => void }) {
  const [outcome, setOutcome] = useState<"acted" | "waited" | null>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!outcome) return;
    updateSession(session.id, { followedUp: true, outcome, outcomeNote: note || null });
    setSubmitted(true);
    setTimeout(onComplete, 2000);
  };

  const truncated = session.situation.length > 60 ? session.situation.slice(0, 60) + "…" : session.situation;

  if (submitted) {
    return (
      <div style={{ background: "#1a1a0e", border: "1px solid #4a3820", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
        <p style={{ color: "#f5c97a", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "18px", margin: 0 }}>
          Noted. That awareness compounds over time.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "#141208", border: "1px solid #3a2e1a", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", animation: "fadeUp 0.5s ease" }}>
      <div>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", marginBottom: "8px" }}>24HR CHECK-IN</div>
        <p style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "16px", lineHeight: 1.4, margin: 0 }}>
          Yesterday you got a <strong style={{ color: "#f5c97a", fontStyle: "normal" }}>{session.verdict}</strong> verdict on: &ldquo;{truncated}&rdquo;
        </p>
        {session.condition && (
          <p style={{ color: "#7a6040", fontFamily: "'Georgia', serif", fontSize: "13px", margin: "8px 0 0" }}>
            Condition: {session.condition}
          </p>
        )}
      </div>
      <div>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", marginBottom: "10px" }}>WHAT DID YOU DO?</div>
        <div style={{ display: "flex", gap: "10px" }}>
          {(["acted", "waited"] as const).map(o => (
            <button key={o} onClick={() => setOutcome(o)} style={{
              flex: 1, padding: "12px", borderRadius: "8px", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.12em",
              background: outcome === o ? "#2a2010" : "transparent",
              border: `1px solid ${outcome === o ? "#f5c97a" : "#2e2416"}`,
              color: outcome === o ? "#f5c97a" : "#5a4830",
              transition: "all 0.15s",
            }}>
              {o.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {outcome && (
        <div style={{ animation: "fadeUp 0.3s ease" }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="How did it go? (optional)"
            style={{
              width: "100%", minHeight: 70, background: "#16120e", border: "1px solid #2e2416",
              borderRadius: "8px", color: "#ede0cc", fontFamily: "'Georgia', serif",
              fontSize: "14px", lineHeight: 1.5, padding: "12px", resize: "none",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <button onClick={submit} style={{
            marginTop: "10px", width: "100%", background: "transparent",
            border: "1px solid #f5c97a", borderRadius: "8px", color: "#f5c97a",
            fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em",
            padding: "12px", cursor: "pointer",
          }}>
            SUBMIT →
          </button>
        </div>
      )}
      <button onClick={() => { updateSession(session.id, { followedUp: true }); onComplete(); }} style={{
        background: "transparent", border: "none", color: "#3a2e1a",
        fontFamily: "'DM Mono', monospace", fontSize: "10px", cursor: "pointer", padding: 0,
      }}>
        skip
      </button>
    </div>
  );
}

// ─── Analysis Result ──────────────────────────────────────────────────────────

function AnalysisResult({
  situation, answers, questions, onResult,
}: {
  situation: string;
  answers: Record<string, boolean>;
  questions: Question[];
  onResult: (r: any) => void;
}) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function analyze() {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ situation, answers, questions }),
        });
        const data = await response.json();
        setResult(data);
        onResult(data);
      } catch {
        const fallback = {
          verdict: "REFLECT", condition: "Take 24 hours before deciding", timeframe: "24 hours",
          headline: "Something felt urgent enough to examine.", biases: ["actionBias"],
          insight: "The fact that you paused already shows awareness. Trust that instinct.",
          reframe: "What would you tell a close friend in this exact situation?",
        };
        setResult(fallback);
        onResult(fallback);
      }
      setLoading(false);
    }
    analyze();
  }, []);

  const verdictColors: Record<string, any> = {
    ACT: { bg: "#1a3a1a", border: "#4caf50", text: "#7ed87e", label: "Go ahead" },
    WAIT: { bg: "#3a1a1a", border: "#e05c5c", text: "#f08080", label: "Hold off" },
    REFLECT: { bg: "#2a2a1a", border: "#f5c97a", text: "#f5c97a", label: "Sit with it" },
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "#a08060", fontFamily: "'DM Mono', monospace", fontSize: "14px" }}>
        reading the situation{dots}
      </div>
    );
  }

  if (result?.mode === "CRISIS") return <CrisisScreen data={result} />;

  const vc = verdictColors[result?.verdict] ?? verdictColors.REFLECT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.6s ease" }}>
      {/* Verdict card */}
      <div style={{ background: vc.bg, border: `1px solid ${vc.border}`, borderRadius: "12px", padding: "20px 24px" }}>
        <div style={{ color: vc.text, fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", marginBottom: "4px" }}>
          {vc.label.toUpperCase()}
        </div>
        <div style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontStyle: "italic", lineHeight: 1.3, marginBottom: "12px" }}>
          {result?.headline}
        </div>
        {/* Conditional verdict */}
        <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ color: vc.text, fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", marginBottom: "4px" }}>
            {result?.verdict === "WAIT" ? `WAIT — ${result?.timeframe ?? "for now"}` : result?.verdict === "ACT" ? "BUT FIRST" : "YOU NEED"}
          </div>
          <div style={{ color: "#ede0cc", fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.5 }}>
            {result?.condition}
          </div>
        </div>
      </div>

      {/* Biases */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em" }}>PATTERNS AT PLAY</div>
        {(result?.biases ?? []).map((b: string) => (
          <div key={b} style={{ background: "#1e1810", border: "1px solid #3a2e1a", borderRadius: "8px", padding: "12px 16px", color: "#c8a87a", fontFamily: "'Georgia', serif", fontSize: "14px", lineHeight: 1.5 }}>
            <span style={{ color: "#f5c97a", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>
              {b.replace(/([A-Z])/g, " $1").toUpperCase().trim()}
            </span>
            <br />{BIAS_MAP[b] ?? b}
          </div>
        ))}
      </div>

      {/* Insight */}
      <div style={{ background: "#161410", border: "1px solid #2e2416", borderRadius: "10px", padding: "20px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "10px" }}>INSIGHT</div>
        <p style={{ color: "#d4c0a0", fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>{result?.insight}</p>
      </div>

      {/* Reframe */}
      <div style={{ background: "linear-gradient(135deg, #1a1408, #201a0a)", border: "1px solid #4a3820", borderRadius: "10px", padding: "20px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "10px" }}>SIT WITH THIS</div>
        <p style={{ color: "#f5c97a", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "19px", lineHeight: 1.5, margin: 0 }}>{result?.reframe}</p>
      </div>

      <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PauseTool() {
  const [step, setStep] = useState(0); // 0=intro,1=situation,2=loading-questions,3=questions,4=breathe,5=result
  const [situation, setSituation] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [breatheCount, setBreatheCount] = useState(4);
  const [pendingFollowUp, setPendingFollowUp] = useState<Session | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for pending follow-ups on mount
  useEffect(() => {
    const pending = getPendingFollowUps();
    if (pending.length > 0) setPendingFollowUp(pending[0]);
  }, []);

  useEffect(() => {
    if (step === 4) {
      setBreatheCount(4);
      timerRef.current = setInterval(() => {
        setBreatheCount(c => {
          if (c <= 1) { clearInterval(timerRef.current!); setTimeout(() => setStep(5), 500); return 0; }
          return c - 1;
        });
      }, 1200);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const fetchQuestions = async () => {
    setStep(2);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });
      const data = await res.json();
      setQuestions(data.questions);
    } catch {
      setQuestions([
        { id: "reversible", text: "Is this action reversible?" },
        { id: "emotional", text: "Are you in a heightened emotional state right now?" },
        { id: "slept", text: "Have you slept on this decision?" },
        { id: "deadline", text: "Is there a real deadline forcing your hand?" },
      ]);
    }
    setStep(3);
  };

  const handleAnswer = (val: boolean) => {
    const newAnswers = { ...answers, [questions[currentQ].id]: val };
    setAnswers(newAnswers);
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
    else setStep(4);
  };

  const handleResult = (result: any) => {
    if (result?.mode === "CRISIS") return;
    const session: Session = {
      id: Math.random().toString(36).slice(2),
      situation,
      verdict: result.verdict,
      condition: result.condition,
      timeframe: result.timeframe,
      timestamp: Date.now(),
      followedUp: false,
      outcome: null,
      outcomeNote: null,
    };
    addSession(session);
  };

  const reset = () => { setStep(0); setSituation(""); setAnswers({}); setCurrentQ(0); setQuestions([]); };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0d0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#4a3820", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.25em", marginBottom: "8px" }}>PAUSE BEFORE YOU ACT</div>
          <h1 style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: "42px", fontWeight: 400, color: "#ede0cc", lineHeight: 1 }}>The Pause</h1>
          <div style={{ width: 40, height: 1, background: "#4a3820", margin: "16px auto 0" }} />
        </div>

        {/* Follow-up banner (shows above main flow if pending) */}
        {pendingFollowUp && step === 0 && (
          <FollowUpBanner session={pendingFollowUp} onComplete={() => setPendingFollowUp(null)} />
        )}

        {/* Step 0: Intro */}
        {step === 0 && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.5s ease" }}>
            <BreathingOrb active={false} />
            <p style={{ color: "#8a7050", fontFamily: "'Georgia', serif", fontSize: "16px", lineHeight: 1.7, margin: 0 }}>
              You&apos;re about to do something. Maybe you shouldn&apos;t. This tool helps you find out.
            </p>
            <button onClick={() => setStep(1)} style={{ background: "transparent", border: "1px solid #4a3820", borderRadius: "8px", color: "#f5c97a", fontFamily: "'DM Mono', monospace", fontSize: "13px", letterSpacing: "0.15em", padding: "14px 28px", cursor: "pointer" }}>
              BEGIN →
            </button>
          </div>
        )}

        {/* Step 1: Situation */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fadeUp 0.5s ease" }}>
            <div>
              <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "12px" }}>WHAT ARE YOU ABOUT TO DO?</div>
              <textarea value={situation} onChange={e => setSituation(e.target.value)}
                placeholder="Describe the impulse, the message, the decision, the action…"
                style={{ width: "100%", minHeight: 120, background: "#16120e", border: "1px solid #2e2416", borderRadius: "10px", color: "#ede0cc", fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.6, padding: "16px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <button onClick={() => situation.trim() && fetchQuestions()} disabled={!situation.trim()} style={{ background: "transparent", border: `1px solid ${situation.trim() ? "#f5c97a" : "#2e2416"}`, borderRadius: "8px", color: situation.trim() ? "#f5c97a" : "#3a2e1a", fontFamily: "'DM Mono', monospace", fontSize: "13px", letterSpacing: "0.15em", padding: "14px 28px", cursor: situation.trim() ? "pointer" : "default" }}>
              CONTINUE →
            </button>
          </div>
        )}

        {/* Step 2: Loading questions */}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#a08060", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>
            generating your questions…
          </div>
        )}

        {/* Step 3: Adaptive Questions */}
        {step === 3 && questions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {questions.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= currentQ ? "#f5c97a" : "#2e2416", transition: "background 0.3s" }} />
              ))}
            </div>
            <div>
              <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "16px" }}>
                {currentQ + 1} / {questions.length}
              </div>
              <p style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", fontStyle: "italic", lineHeight: 1.3, margin: 0 }}>
                {questions[currentQ].text}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {([true, false] as const).map(val => (
                <button key={String(val)} onClick={() => handleAnswer(val)} style={{ flex: 1, background: "#16120e", border: "1px solid #2e2416", borderRadius: "10px", color: "#c8a87a", fontFamily: "'DM Mono', monospace", fontSize: "12px", letterSpacing: "0.12em", padding: "16px", cursor: "pointer" }}>
                  {val ? "YES" : "NO"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Breathe */}
        {step === 4 && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "28px", alignItems: "center", animation: "fadeUp 0.5s ease" }}>
            <BreathingOrb active={true} />
            <div>
              <div style={{ color: "#f5c97a", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "20px", marginBottom: "6px" }}>Just breathe for a moment.</div>
              <div style={{ color: "#4a3820", fontFamily: "'DM Mono', monospace", fontSize: "12px" }}>
                {breatheCount > 0 ? `${breatheCount} breaths` : "reading your situation…"}
              </div>
              <p style={{ color: "#5a4030", fontFamily: "'Georgia', serif", fontSize: "13px", marginTop: "12px", lineHeight: 1.5 }}>
                Your body&apos;s stress response peaks in seconds.<br />Four breaths is enough to interrupt it.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Result */}
        {step === 5 && (
          <div>
            <AnalysisResult situation={situation} answers={answers} questions={questions} onResult={handleResult} />
            <button onClick={reset} style={{ marginTop: "24px", width: "100%", background: "transparent", border: "1px solid #2e2416", borderRadius: "8px", color: "#4a3820", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", padding: "12px", cursor: "pointer" }}>
              START OVER
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #3a2e1a; }
      `}</style>
    </div>
  );
}