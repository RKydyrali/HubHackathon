import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Sparkle, X } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import type { Profile } from "@/types/domain";

const profileSchema = z.object({
  fullName: z.string().min(2, "Введите имя и фамилию."),
  district: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).min(1, "Добавьте хотя бы один навык."),
  resumeText: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export function ProfileEditor({ profile }: { profile: Profile | null }) {
  const upsertProfile = useMutation(api.profiles.upsertMyProfile);
  const { copy, locale } = useI18n();
  const [skillDraft, setSkillDraft] = useState("");
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? "",
      district: profile?.district ?? "",
      bio: profile?.bio ?? "",
      skills: profile?.skills ?? [],
      resumeText: profile?.resumeText ?? "",
    },
    mode: "onChange",
  });

  const values = useWatch({ control: form.control });
  const skills = values.skills ?? [];
  const completion = useMemo(() => {
    const checks = [
      values.fullName?.trim(),
      values.district?.trim(),
      values.bio?.trim(),
      skills.length > 0,
      values.resumeText?.trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [skills.length, values.bio, values.district, values.fullName, values.resumeText]);

  useEffect(() => {
    form.reset({
      fullName: profile?.fullName ?? "",
      district: profile?.district ?? "",
      bio: profile?.bio ?? "",
      skills: profile?.skills ?? [],
      resumeText: profile?.resumeText ?? "",
    });
  }, [form, profile]);

  function addSkill() {
    const value = skillDraft.trim();
    if (!value || skills.includes(value)) return;
    form.setValue("skills", [...skills, value], { shouldDirty: true, shouldValidate: true });
    setSkillDraft("");
  }

  function removeSkill(skill: string) {
    form.setValue("skills", skills.filter((item) => item !== skill), { shouldDirty: true, shouldValidate: true });
  }

  async function submit(values: ProfileForm) {
    await upsertProfile({
      fullName: values.fullName,
      city: "Aktau",
      district: values.district || undefined,
      bio: values.bio || undefined,
      skills: values.skills,
      resumeText: values.resumeText || undefined,
    });
    toast.success(copy.profile.saved);
  }

  const pending = form.formState.isSubmitting;

  return (
    <form className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" onSubmit={form.handleSubmit(submit)}>
      <div className="flex flex-col gap-4">
        <SectionPanel title={copy.profile.personal}>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field data-invalid={Boolean(form.formState.errors.fullName)}>
              <FieldLabel htmlFor="fullName">{copy.profile.fullName}</FieldLabel>
              <Input id="fullName" disabled={pending} aria-invalid={Boolean(form.formState.errors.fullName)} {...form.register("fullName")} />
              <FieldError>{form.formState.errors.fullName?.message}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="district">{copy.vacancies.district}</FieldLabel>
              <Input id="district" disabled={pending} placeholder={locale === "kk" ? "12 шағын аудан" : "12 мкр"} {...form.register("district")} />
            </Field>
          </FieldGroup>
        </SectionPanel>

        <SectionPanel title={copy.profile.skills}>
          <Field data-invalid={Boolean(form.formState.errors.skills)}>
            <FieldLabel htmlFor="skillDraft">{copy.profile.addSkill}</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="skillDraft"
                value={skillDraft}
                disabled={pending}
                onChange={(event) => setSkillDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addSkill} disabled={pending}>
                <Plus data-icon="inline-start" weight="bold" />
                {copy.profile.addSkill}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} tone="muted" className="min-h-7 gap-1.5">
                  {skill}
                  <button
                    type="button"
                    aria-label={locale === "kk" ? `${skill} дағдысын өшіру` : `Удалить навык ${skill}`}
                    onClick={() => removeSkill(skill)}
                  >
                    <X weight="bold" />
                  </button>
                </Badge>
              ))}
            </div>
            <FieldError>{form.formState.errors.skills?.message}</FieldError>
          </Field>
        </SectionPanel>

        <SectionPanel title={copy.profile.resume}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="bio">{copy.profile.bio}</FieldLabel>
              <Textarea id="bio" rows={4} disabled={pending} {...form.register("bio")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="resumeText">{copy.profile.resumeText}</FieldLabel>
              <Textarea id="resumeText" rows={9} disabled={pending} {...form.register("resumeText")} />
              <FieldDescription>{copy.profile.aiRefresh}</FieldDescription>
            </Field>
          </FieldGroup>
        </SectionPanel>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SectionPanel title={copy.profile.progress} patterned>
          <div className="flex items-end justify-between gap-4">
            <div className="font-heading text-5xl font-extrabold tracking-tight text-foreground">{completion}%</div>
            <Sparkle className="text-primary" weight="fill" />
          </div>
          <Progress className="mt-4" value={completion} />
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.profile.aiRefresh}</p>
          <Button type="submit" className="mt-5 w-full" disabled={!form.formState.isValid || pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? copy.profile.saving : copy.profile.save}
          </Button>
        </SectionPanel>
      </aside>
    </form>
  );
}
