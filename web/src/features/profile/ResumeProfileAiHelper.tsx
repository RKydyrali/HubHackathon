import { MagicWand, WarningCircle } from "@phosphor-icons/react";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import type { Profile } from "@/types/domain";

const MIN_RESUME_TEXT_LENGTH = 80;

type ResumeProfileDraft = {
  fullName: string;
  city: string;
  district: string | null;
  skills: string[];
  bio: string;
  resumeText: string;
};

type ResumeProfileDraftResult = {
  ok: true;
  aiFailed: boolean;
  draft: ResumeProfileDraft;
};

function splitSkills(value: string): string[] {
  const skills: string[] = [];
  for (const item of value.split(/[\n,;]+/)) {
    const cleaned = item.trim();
    if (!cleaned) continue;
    if (skills.some((skill) => skill.toLocaleLowerCase() === cleaned.toLocaleLowerCase())) continue;
    skills.push(cleaned);
  }
  return skills;
}

export function ResumeProfileAiHelper({ profile }: { profile: Profile | null }) {
  const { copy } = useI18n();
  const extractResumeProfileDraft = useAction(api.ai.extractResumeProfileDraft);
  const upsertMyProfile = useMutation(api.profiles.upsertMyProfile);
  const [resumeText, setResumeText] = useState("");
  const [draft, setDraft] = useState<ResumeProfileDraft | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFallback, setAiFallback] = useState(false);

  async function prepareDraft() {
    const trimmed = resumeText.trim();
    setError(null);
    setAiFallback(false);
    if (trimmed.length < MIN_RESUME_TEXT_LENGTH) {
      setError(copy.profile.resumeAiTooShort);
      return;
    }
    setLoading(true);
    try {
      const result = (await extractResumeProfileDraft({
        resumeText: trimmed,
      })) as ResumeProfileDraftResult;
      setDraft(result.draft);
      setSkillsText(result.draft.skills.join(", "));
      setAiFallback(result.aiFailed);
      if (result.aiFailed) {
        setError(copy.profile.resumeAiFallback);
      }
    } catch {
      setError(copy.profile.resumeAiFailed);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(field: keyof ResumeProfileDraft, value: string) {
    setDraft((current) => {
      if (!current) return current;
      if (field === "district") {
        return { ...current, district: value.trim() ? value : null };
      }
      return { ...current, [field]: value };
    });
  }

  async function saveDraft() {
    if (!draft) return;
    const skills = splitSkills(skillsText);
    const fullName = draft.fullName.trim() || profile?.fullName?.trim() || "";
    if (!fullName || !skills.length) {
      setError(copy.profile.resumeAiReviewRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertMyProfile({
        fullName,
        city: draft.city.trim() || profile?.city || "Aktau",
        district: draft.district?.trim() || undefined,
        bio: draft.bio.trim() || undefined,
        skills,
        resumeText: draft.resumeText.trim() || undefined,
      });
      toast.success(copy.profile.saved);
    } catch {
      setError(copy.profile.resumeAiSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionPanel
      title={copy.profile.resumeAiTitle}
      subtitle={copy.profile.resumeAiSubtitle}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
        <Field data-invalid={Boolean(error && !draft)}>
          <FieldLabel htmlFor="resumeProfileAiText">{copy.profile.resumeAiPasteLabel}</FieldLabel>
          <Textarea
            id="resumeProfileAiText"
            rows={8}
            value={resumeText}
            disabled={loading || saving}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder={copy.profile.resumeAiPlaceholder}
          />
          <FieldDescription>{copy.profile.resumeAiPasteHelp}</FieldDescription>
          {!draft ? <FieldError>{error ?? undefined}</FieldError> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void prepareDraft()}
              disabled={loading || saving || !resumeText.trim()}
            >
              {loading ? <Spinner data-icon="inline-start" /> : <MagicWand data-icon="inline-start" weight="bold" />}
              {loading ? copy.profile.resumeAiPreparing : copy.profile.resumeAiPrepare}
            </Button>
            {error && !loading ? (
              <Button type="button" variant="outline" onClick={() => void prepareDraft()}>
                {copy.common.retry}
              </Button>
            ) : null}
          </div>
        </Field>

        <div className="rounded-lg border bg-muted/35 p-4">
          {draft ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-primary/15 bg-background/80 p-3 text-sm leading-6 text-muted-foreground">
                <p className="font-medium text-foreground">{copy.profile.resumeAiPrepared}</p>
                {aiFallback || error ? (
                  <p className="mt-1 flex gap-2 text-muted-foreground">
                    <WarningCircle className="mt-0.5 shrink-0 text-primary" weight="bold" />
                    <span>{error ?? copy.profile.resumeAiFallback}</span>
                  </p>
                ) : null}
              </div>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="resumeDraftFullName">{copy.profile.fullName}</FieldLabel>
                  <Input
                    id="resumeDraftFullName"
                    value={draft.fullName}
                    disabled={saving}
                    onChange={(event) => updateDraft("fullName", event.target.value)}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="resumeDraftCity">{copy.vacancies.region}</FieldLabel>
                    <Input
                      id="resumeDraftCity"
                      value={draft.city}
                      disabled={saving}
                      onChange={(event) => updateDraft("city", event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="resumeDraftDistrict">{copy.vacancies.district}</FieldLabel>
                    <Input
                      id="resumeDraftDistrict"
                      value={draft.district ?? ""}
                      disabled={saving}
                      onChange={(event) => updateDraft("district", event.target.value)}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="resumeDraftSkills">{copy.profile.resumeAiSkillsLabel}</FieldLabel>
                  <Textarea
                    id="resumeDraftSkills"
                    rows={3}
                    value={skillsText}
                    disabled={saving}
                    onChange={(event) => setSkillsText(event.target.value)}
                  />
                  <FieldDescription>{copy.profile.resumeAiSkillsHelp}</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="resumeDraftBio">{copy.profile.resumeAiBioLabel}</FieldLabel>
                  <Textarea
                    id="resumeDraftBio"
                    rows={4}
                    value={draft.bio}
                    disabled={saving}
                    onChange={(event) => updateDraft("bio", event.target.value)}
                  />
                </Field>
              </FieldGroup>
              <Button type="button" onClick={() => void saveDraft()} disabled={saving}>
                {saving ? <Spinner data-icon="inline-start" /> : null}
                {saving ? copy.profile.saving : copy.profile.resumeAiSaveDraft}
              </Button>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col justify-center rounded-lg border border-dashed bg-background/70 p-5 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">{copy.profile.resumeAiPreviewTitle}</p>
              <p className="mt-2">{copy.profile.resumeAiPreviewBody}</p>
            </div>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}
