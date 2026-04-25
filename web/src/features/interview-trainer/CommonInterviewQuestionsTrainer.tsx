import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AiUnavailableState } from "@/components/feedback/AiUnavailableState";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { scoreAnswerHeuristic } from "./heuristics";
import { loadQuestionsState, saveQuestionsState } from "./storage";

type Question = { id: string; prompt: string };

const DEFAULT_DURATION_SEC = 75;

function formatTime(sec: number) {
  const s = Math.max(0, sec);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function buildResumeAppendBlock(payload: { question: string; answer: string; score?: number }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const scoreLine = payload.score == null ? "" : ` (score: ${payload.score})`;
  return [
    "",
    "—",
    `Interview Trainer (${stamp})`,
    `Q: ${payload.question}`,
    `A${scoreLine}: ${payload.answer}`,
  ].join("\n");
}

export function CommonInterviewQuestionsTrainer() {
  const { copy } = useI18n();
  const it = copy.interviewTrainer;

  const questions: Question[] = useMemo(
    () => [
      { id: "q1", prompt: "Расскажите о себе за 60 секунд." },
      { id: "q2", prompt: "Почему вы хотите эту работу?" },
      { id: "q3", prompt: "Какая ваша сильная сторона? Приведите пример." },
      { id: "q4", prompt: "Расскажите о сложной ситуации на работе и как вы её решили." },
      { id: "q5", prompt: "Какие у вас ожидания по графику и условиям?" },
    ],
    [],
  );

  const stored = typeof window !== "undefined" ? loadQuestionsState() : null;
  const [activeIndex, setActiveIndex] = useState(clampIndex(stored?.activeIndex ?? 0, questions.length));
  const [answers, setAnswers] = useState<Record<string, { text: string; submitted: boolean; score?: number; suggestion?: string }>>(
    stored?.answers ?? {},
  );
  const [pending, setPending] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);

  const [running, setRunning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(DEFAULT_DURATION_SEC);
  const tickRef = useRef<number | null>(null);

  const profile = useQuery(api.profiles.getMyProfile);
  const upsertProfile = useMutation(api.profiles.upsertMyProfile);
  const scoreAnswer = useAction(api.ai.scoreInterviewAnswer);

  const active = questions[activeIndex];
  const activeAnswer = answers[active.id]?.text ?? "";
  const activeSubmitted = Boolean(answers[active.id]?.submitted);
  const activeScore = answers[active.id]?.score;
  const activeSuggestion = answers[active.id]?.suggestion;

  const completedCount = useMemo(
    () => questions.filter((q) => answers[q.id]?.submitted).length,
    [answers, questions],
  );
  const done = completedCount === questions.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveQuestionsState({ activeIndex, answers });
  }, [activeIndex, answers]);

  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [running]);

  useEffect(() => {
    setRunning(false);
    setRemainingSec(DEFAULT_DURATION_SEC);
  }, [activeIndex]);

  const canSaveToProfile = useMemo(() => {
    if (profile === undefined) return false;
    if (!profile) return false;
    return Boolean(profile.fullName?.trim()) && Array.isArray(profile.skills) && profile.skills.length > 0;
  }, [profile]);

  const handleSubmit = useCallback(async () => {
    const text = activeAnswer.trim();
    if (!text) {
      toast.error(it.errors.emptyAnswer);
      return;
    }
    setPending(true);
    try {
      const ai = await scoreAnswer({ question: active.prompt, answer: text });
      if (ai.aiFailed || !ai.data) {
        setAiAvailable(false);
        const fallback = scoreAnswerHeuristic(active.prompt, text);
        setAnswers((prev) => ({
          ...prev,
          [active.id]: { text, submitted: true, score: fallback.score, suggestion: fallback.suggestion },
        }));
        return;
      }
      setAiAvailable(true);
      setAnswers((prev) => ({
        ...prev,
        [active.id]: { text, submitted: true, score: ai.data.score, suggestion: ai.data.suggestion },
      }));
    } catch {
      setAiAvailable(false);
      const fallback = scoreAnswerHeuristic(active.prompt, text);
      setAnswers((prev) => ({
        ...prev,
        [active.id]: { text, submitted: true, score: fallback.score, suggestion: fallback.suggestion },
      }));
    } finally {
      setPending(false);
    }
  }, [active, activeAnswer, it.errors.emptyAnswer, scoreAnswer]);

  const strongest = useMemo(() => {
    let best: { q: Question; score: number; answer: string } | null = null;
    for (const q of questions) {
      const row = answers[q.id];
      if (!row?.submitted || row.score == null) continue;
      if (!best || row.score > best.score) best = { q, score: row.score, answer: row.text };
    }
    return best;
  }, [answers, questions]);

  const nextImproveHint = useMemo(() => {
    const suggestions = questions
      .map((q) => answers[q.id]?.suggestion)
      .filter((s): s is string => Boolean(s && s.trim()));
    return suggestions[0] ?? "Сделайте следующую попытку короче и добавьте результат в цифрах.";
  }, [answers, questions]);

  const handleSaveBest = useCallback(async () => {
    if (profile === undefined) return;
    if (!canSaveToProfile || !profile) {
      toast.message(copy.common.noProfile);
      return;
    }
    if (!strongest) {
      toast.message(copy.common.empty);
      return;
    }
    const nextResumeText = `${profile.resumeText ?? ""}${buildResumeAppendBlock({
      question: strongest.q.prompt,
      answer: strongest.answer,
      score: strongest.score,
    })}`.trim();
    try {
      await upsertProfile({
        fullName: profile.fullName,
        city: profile.city,
        district: profile.district ?? undefined,
        bio: profile.bio ?? undefined,
        skills: profile.skills,
        resumeText: nextResumeText,
      });
      toast.success(it.questions.savedToast);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }, [canSaveToProfile, copy.common.empty, copy.common.noProfile, it.questions.savedToast, profile, strongest, upsertProfile]);

  if (done) {
    return (
      <div className="space-y-4">
        {!aiAvailable ? <AiUnavailableState /> : null}
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">{it.questions.completedTitle}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/25 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {it.questions.summaryStrongest}
              </p>
              {strongest ? (
                <>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {strongest.q.prompt}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {it.pitch.scoreLabel}:{" "}
                    <span className="font-semibold text-foreground">{strongest.score}</span>
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {strongest.answer}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{copy.common.empty}</p>
              )}
            </div>
            <div className="rounded-xl border bg-muted/25 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {it.questions.summaryNextImprove}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{nextImproveHint}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void handleSaveBest()} disabled={!canSaveToProfile}>
              {it.questions.saveBestAnswers}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAnswers({});
                setActiveIndex(0);
              }}
            >
              {copy.common.retry}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!aiAvailable ? <AiUnavailableState onRetry={() => void handleSubmit()} /> : null}
      <p className="text-sm leading-6 text-muted-foreground">{it.questions.hint}</p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {it.questions.progressLabel.replace("{{n}}", String(completedCount)).replace("{{total}}", String(questions.length))}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{active.prompt}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border bg-muted/30 px-3 py-1 text-sm font-semibold">
            {it.questions.timeLeft}: {formatTime(remainingSec)}
          </div>
          <Button type="button" size="sm" onClick={() => setRunning((v) => !v)} disabled={remainingSec === 0}>
            {running ? it.questions.pause : it.questions.start}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setRunning(false);
              setRemainingSec(DEFAULT_DURATION_SEC);
            }}
          >
            {it.questions.reset}
          </Button>
        </div>
      </div>

      <Textarea
        value={activeAnswer}
        onChange={(e) => {
          const text = e.target.value;
          setAnswers((prev) => ({
            ...prev,
            [active.id]: { ...(prev[active.id] ?? { submitted: false }), text, submitted: false },
          }));
        }}
        placeholder={it.questions.answerPlaceholder}
        rows={6}
        className="resize-none"
        disabled={pending}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleSubmit()} disabled={pending || !activeAnswer.trim()}>
          {pending ? it.questions.submitting : it.questions.submit}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setActiveIndex((i) => clampIndex(i - 1, questions.length))}
          disabled={activeIndex === 0}
        >
          {it.questions.prev}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setActiveIndex((i) => clampIndex(i + 1, questions.length))}
          disabled={activeIndex === questions.length - 1}
        >
          {it.questions.next}
        </Button>
      </div>

      {activeSubmitted ? (
        <div className="rounded-2xl border bg-card p-4">
          {activeScore != null ? (
            <p className="text-sm text-muted-foreground">
              {it.pitch.scoreLabel}: <span className="font-semibold text-foreground">{activeScore}</span>
            </p>
          ) : null}
          {activeSuggestion ? (
            <p className="mt-2 text-sm leading-6 text-foreground">{activeSuggestion}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function clampIndex(value: number, len: number) {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(len - 1, value));
}

