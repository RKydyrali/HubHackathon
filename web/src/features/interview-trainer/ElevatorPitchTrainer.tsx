import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AiUnavailableState } from "@/components/feedback/AiUnavailableState";
import { Button } from "@/components/shared/Button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { improvePitchHeuristic } from "./heuristics";
import { loadPitchState, savePitchState } from "./storage";

type PitchResult = {
  score: number;
  variants: { short: string; neutral: string; confident: string };
};

function buildResumeAppendBlock(payload: { label: string; text: string }) {
  const stamp = new Date().toISOString().slice(0, 10);
  return [
    "",
    "—",
    `Interview Trainer (${stamp})`,
    `${payload.label}: ${payload.text}`,
  ].join("\n");
}

async function copyToClipboard(text: string, copiedToast: string, failedToast: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(copiedToast);
  } catch {
    toast.error(failedToast);
  }
}

export function ElevatorPitchTrainer() {
  const { copy } = useI18n();
  const it = copy.interviewTrainer;
  const profile = useQuery(api.profiles.getMyProfile);
  const upsertProfile = useMutation(api.profiles.upsertMyProfile);
  const improvePitch = useAction(api.ai.improveElevatorPitch);

  const stored = typeof window !== "undefined" ? loadPitchState() : null;
  const [inputText, setInputText] = useState(stored?.inputText ?? "");
  const [pending, setPending] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [result, setResult] = useState<PitchResult | null>(stored?.result ?? null);
  const [heuristicNotes, setHeuristicNotes] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    savePitchState({ inputText, result });
  }, [inputText, result]);

  const canSaveToProfile = useMemo(() => {
    if (profile === undefined) return false;
    if (!profile) return false;
    return Boolean(profile.fullName?.trim()) && Array.isArray(profile.skills) && profile.skills.length > 0;
  }, [profile]);

  const handleImprove = useCallback(async () => {
    const text = inputText.trim();
    if (!text) {
      toast.error(it.errors.emptyPitch);
      return;
    }
    setPending(true);
    setHeuristicNotes([]);
    try {
      const ai = await improvePitch({ rawText: text });
      if (ai.aiFailed || !ai.data) {
        setAiAvailable(false);
        const fallback = improvePitchHeuristic(text);
        setResult({ score: fallback.score, variants: fallback.variants });
        setHeuristicNotes(fallback.notes);
        return;
      }
      setAiAvailable(true);
      setResult(ai.data);
    } catch {
      setAiAvailable(false);
      const fallback = improvePitchHeuristic(text);
      setResult({ score: fallback.score, variants: fallback.variants });
      setHeuristicNotes(fallback.notes);
    } finally {
      setPending(false);
    }
  }, [improvePitch, inputText, it.errors.emptyPitch]);

  const handleSave = useCallback(
    async (label: string, text: string) => {
      if (profile === undefined) return;
      if (!canSaveToProfile || !profile) {
        toast.message(copy.common.noProfile);
        return;
      }
      const nextResumeText = `${profile.resumeText ?? ""}${buildResumeAppendBlock({ label, text })}`.trim();
      try {
        await upsertProfile({
          fullName: profile.fullName,
          city: profile.city,
          district: profile.district ?? undefined,
          bio: profile.bio ?? undefined,
          skills: profile.skills,
          resumeText: nextResumeText,
        });
        toast.success(it.pitch.savedToast);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    },
    [canSaveToProfile, copy.common.noProfile, it.pitch.savedToast, profile, upsertProfile],
  );

  return (
    <div className="space-y-4">
      {!aiAvailable ? (
        <AiUnavailableState onRetry={() => void handleImprove()} />
      ) : null}

      <p className="text-sm leading-6 text-muted-foreground">{it.pitch.hint}</p>

      <Textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder={it.pitch.placeholder}
        rows={5}
        className="resize-none"
        disabled={pending}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void handleImprove()} disabled={pending || !inputText.trim()}>
          {pending ? it.pitch.improving : it.pitch.improve}
        </Button>
      </div>

      {result ? (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {it.pitch.scoreLabel}: <span className="font-semibold text-foreground">{result.score}</span>
            </p>
          </div>

          {heuristicNotes.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {heuristicNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{it.pitch.variantsTitle}</p>

            {(
              [
                { key: "short", label: it.pitch.shortLabel, text: result.variants.short },
                { key: "neutral", label: it.pitch.neutralLabel, text: result.variants.neutral },
                { key: "confident", label: it.pitch.confidentLabel, text: result.variants.confident },
              ] as const
            ).map((item) => (
              <div key={item.key} className="rounded-xl border bg-muted/25 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyToClipboard(item.text, it.pitch.copiedToast, copy.common.copyFailed)}
                    >
                      {it.pitch.copy}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!canSaveToProfile}
                      onClick={() => void handleSave(item.label, item.text)}
                    >
                      {it.pitch.saveToProfile}
                    </Button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

