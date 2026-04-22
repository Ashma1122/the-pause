"use client";

import { useState, useEffect, useRef } from "react";

const QUESTIONS = [
  { id: "reversible", text: "Is this action reversible?" },
  { id: "emotional", text: "Are you in a heightened emotional state right now?" },
  { id: "slept", text: "Have you slept on this decision?" },
  { id: "deadline", text: "Is there a real deadline forcing your hand?" },
];

const BIAS_MAP: Record<string, string> = {
  actionBias: "Action Bias — your brain prefers doing over waiting, even when waiting is smarter.",
  uncertaintyAvoidance: "Uncertainty Avoidance — you're trying to resolve the discomfort of not knowing.",
  distressIntolerance: "Distress Intolerance — the anxiety of waiting feels worse than a bad outcome.",
  cognitiveDissonance: "Cognitive Dissonance — you're acting to resolve conflicting thoughts, not because it's right.",
};

// ─── Crisis UI ────────────────────────────────────────────────────────────────

function CrisisScreen({ data }: { data: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.5s ease" }}>
      <div style={{
        background: "#2a0a0a",
        border: "1px solid #cc3333",
        borderRadius: "12px",
        padding: "24px",
      }}>
        <div style={{ color: "#ff6666", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", marginBottom: "10px" }}>
          PLEASE READ THIS
        </div>
        <p style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "20px", lineHeight: 1.4, margin: 0 }}>
          {data.headline}
        </p>
      </div>

      <p style={{ color: "#c8a87a", fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>
        {data.message}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "4px" }}>
          WHAT TO DO RIGHT NOW
        </div>
        {data.actions?.map((action: string, i: number) => (
          <div key={i} style={{
            background: "#1a1008",
            border: "1px solid #3a1a1a",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#d4c0a0",
            fontFamily: "'Georgia', serif",
            fontSize: "14px",
            lineHeight: 1.5,
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}>
            <span style={{ color: "#cc3333", marginTop: "2px" }}>→</span>
            {action}
          </div>
        ))}
      </div>

      <div style={{
        background: "#1a0808",
        border: "1px solid #4a1a1a",
        borderRadius: "10px",
        padding: "20px",
      }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "12px" }}>
          CRISIS LINES
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {Object.entries(data.support || {}).map(([key, val]) => (
            <div key={key} style={{ color: "#c8a87a", fontFamily: "'Georgia', serif", fontSize: "14px" }}>
              {String(val)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Breathing orb ────────────────────────────────────────────────────────────

function BreathingOrb({ active }: { active: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle at 40% 40%, #f5c97a, #c97d2a)",
          boxShadow: active
            ? "0 0 60px 20px rgba(245,201,122,0.3), 0 0 120px 40px rgba(201,125,42,0.15)"
            : "0 0 20px 4px rgba(245,201,122,0.1)",
          animation: active ? "breathe 4s ease-in-out infinite" : "none",
          transition: "box-shadow 1s ease",
        }}
      />
      {active && (
        <p style={{ color: "#f5c97a", fontSize: "13px", letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace", opacity: 0.7 }}>
          breathe with it
        </p>
      )}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.35); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Analysis result ──────────────────────────────────────────────────────────

function AnalysisResult({ situation, answers }: { situation: string; answers: Record<string, boolean> }) {
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
          body: JSON.stringify({ situation, answers }),
        });
        const data = await response.json();
        setResult(data);
      } catch {
        setResult({
          verdict: "REFLECT",
          headline: "Something felt urgent enough to examine.",
          biases: ["actionBias"],
          insight: "The fact that you paused to think about this already shows awareness. Trust that instinct.",
          reframe: "What would you tell a close friend in this exact situation?",
        });
      }
      setLoading(false);
    }
    analyze();
  }, []);

  const verdictColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
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

  // Crisis mode
  if (result?.mode === "CRISIS") {
    return <CrisisScreen data={result} />;
  }

  const vc = verdictColors[result?.verdict] ?? verdictColors.REFLECT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.6s ease" }}>
      <div style={{
        background: vc.bg,
        border: `1px solid ${vc.border}`,
        borderRadius: "12px",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <div>
          <div style={{ color: vc.text, fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.2em", marginBottom: "6px" }}>
            {vc.label.toUpperCase()}
          </div>
          <div style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontStyle: "italic", lineHeight: 1.3 }}>
            {result?.headline}
          </div>
        </div>
        <div style={{
          minWidth: 64, height: 64, borderRadius: "50%",
          border: `2px solid ${vc.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: vc.text, fontFamily: "'DM Mono', monospace", fontSize: "11px",
          letterSpacing: "0.1em", textAlign: "center", lineHeight: 1.2,
        }}>
          {result?.verdict}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em" }}>PATTERNS AT PLAY</div>
        {(result?.biases ?? []).map((b: string) => (
          <div key={b} style={{
            background: "#1e1810",
            border: "1px solid #3a2e1a",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#c8a87a",
            fontFamily: "'Georgia', serif",
            fontSize: "14px",
            lineHeight: 1.5,
          }}>
            <span style={{ color: "#f5c97a", fontFamily: "'DM Mono', monospace", fontSize: "11px" }}>
              {b.replace(/([A-Z])/g, " $1").toUpperCase().trim()}
            </span>
            <br />
            {BIAS_MAP[b] ?? b}
          </div>
        ))}
      </div>

      <div style={{
        background: "#161410",
        border: "1px solid #2e2416",
        borderRadius: "10px",
        padding: "20px",
      }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "10px" }}>INSIGHT</div>
        <p style={{ color: "#d4c0a0", fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>
          {result?.insight}
        </p>
      </div>

      <div style={{
        background: "linear-gradient(135deg, #1a1408, #201a0a)",
        border: "1px solid #4a3820",
        borderRadius: "10px",
        padding: "20px",
      }}>
        <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "10px" }}>SIT WITH THIS</div>
        <p style={{ color: "#f5c97a", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "19px", lineHeight: 1.5, margin: 0 }}>
          {result?.reframe}
        </p>
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PauseTool() {
  const [step, setStep] = useState(0); // 0=intro, 1=situation, 2=questions, 3=breathe, 4=result
  const [situation, setSituation] = useState("");
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [breatheCount, setBreatheCount] = useState(4);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 3) {
      setBreatheCount(4);
      timerRef.current = setInterval(() => {
        setBreatheCount(c => {
          if (c <= 1) {
            clearInterval(timerRef.current!);
            setTimeout(() => setStep(4), 500);
            return 0;
          }
          return c - 1;
        });
      }, 1200);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const handleAnswer = (val: boolean) => {
    const newAnswers = { ...answers, [QUESTIONS[currentQ].id]: val };
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setStep(3);
    }
  };

  const reset = () => { setStep(0); setSituation(""); setAnswers({}); setCurrentQ(0); };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0d0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#4a3820", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.25em", marginBottom: "8px" }}>
            PAUSE BEFORE YOU ACT
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: "42px", fontWeight: 400, color: "#ede0cc", lineHeight: 1 }}>
            The Pause
          </h1>
          <div style={{ width: 40, height: 1, background: "#4a3820", margin: "16px auto 0" }} />
        </div>

        {/* Step 0: Intro */}
        {step === 0 && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.5s ease" }}>
            <BreathingOrb active={false} />
            <p style={{ color: "#8a7050", fontFamily: "'Georgia', serif", fontSize: "16px", lineHeight: 1.7, margin: 0 }}>
              You&apos;re about to do something. Maybe you shouldn&apos;t. This tool helps you find out.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Action Bias", "Uncertainty Avoidance", "Distress Intolerance", "Cognitive Dissonance"].map(b => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: "10px", color: "#5a4830", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.1em" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#4a3820" }} />
                  {b.toUpperCase()}
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              style={{
                background: "transparent", border: "1px solid #4a3820", borderRadius: "8px",
                color: "#f5c97a", fontFamily: "'DM Mono', monospace", fontSize: "13px",
                letterSpacing: "0.15em", padding: "14px 28px", cursor: "pointer",
              }}
            >
              BEGIN →
            </button>
          </div>
        )}

        {/* Step 1: Situation */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fadeUp 0.5s ease" }}>
            <div>
              <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "12px" }}>
                WHAT ARE YOU ABOUT TO DO?
              </div>
              <textarea
                value={situation}
                onChange={e => setSituation(e.target.value)}
                placeholder="Describe the impulse, the message, the decision, the action…"
                style={{
                  width: "100%", minHeight: 120, background: "#16120e",
                  border: "1px solid #2e2416", borderRadius: "10px", color: "#ede0cc",
                  fontFamily: "'Georgia', serif", fontSize: "15px", lineHeight: 1.6,
                  padding: "16px", resize: "vertical", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <button
              onClick={() => situation.trim() && setStep(2)}
              disabled={!situation.trim()}
              style={{
                background: "transparent",
                border: `1px solid ${situation.trim() ? "#f5c97a" : "#2e2416"}`,
                borderRadius: "8px",
                color: situation.trim() ? "#f5c97a" : "#3a2e1a",
                fontFamily: "'DM Mono', monospace", fontSize: "13px",
                letterSpacing: "0.15em", padding: "14px 28px",
                cursor: situation.trim() ? "pointer" : "default",
              }}
            >
              CONTINUE →
            </button>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {QUESTIONS.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 2, borderRadius: 2,
                  background: i <= currentQ ? "#f5c97a" : "#2e2416",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <div>
              <div style={{ color: "#7a6040", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", marginBottom: "16px" }}>
                {currentQ + 1} / {QUESTIONS.length}
              </div>
              <p style={{ color: "#ede0cc", fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", fontStyle: "italic", lineHeight: 1.3, margin: 0 }}>
                {QUESTIONS[currentQ].text}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              {([true, false] as const).map(val => (
                <button
                  key={String(val)}
                  onClick={() => handleAnswer(val)}
                  style={{
                    flex: 1, background: "#16120e", border: "1px solid #2e2416",
                    borderRadius: "10px", color: "#c8a87a", fontFamily: "'DM Mono', monospace",
                    fontSize: "12px", letterSpacing: "0.12em", padding: "16px", cursor: "pointer",
                  }}
                >
                  {val ? "YES" : "NO"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Breathe */}
        {step === 3 && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "28px", alignItems: "center", animation: "fadeUp 0.5s ease" }}>
            <BreathingOrb active={true} />
            <div>
              <div style={{ color: "#f5c97a", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "20px", marginBottom: "6px" }}>
                Just breathe for a moment.
              </div>
              <div style={{ color: "#4a3820", fontFamily: "'DM Mono', monospace", fontSize: "12px" }}>
                {breatheCount > 0 ? `${breatheCount} breaths` : "reading your situation…"}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && (
          <div>
            <AnalysisResult situation={situation} answers={answers} />
            <button
              onClick={reset}
              style={{
                marginTop: "24px", width: "100%", background: "transparent",
                border: "1px solid #2e2416", borderRadius: "8px", color: "#4a3820",
                fontFamily: "'DM Mono', monospace", fontSize: "11px",
                letterSpacing: "0.15em", padding: "12px", cursor: "pointer",
              }}
            >
              START OVER
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #3a2e1a; }
      `}</style>
    </div>
  );
}
