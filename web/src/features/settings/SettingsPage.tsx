import { useUser } from "@clerk/clerk-react";
import { TelegramLogo, UserCircle } from "@phosphor-icons/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { LoadingSkeleton } from "@/components/feedback/LoadingSkeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionFooter } from "@/components/product/ActionFooter";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/product-experience";
import { getTelegramBotUrl } from "@/lib/telegramBotUrl";

export function SettingsPage() {
  const { copy } = useI18n();
  const s = copy.settings;
  const preferenceLabels: Array<{ key: keyof NotificationPreferences; label: string; helper: string }> =
    useMemo(
      () => [
        { key: "inApp", label: s.prefInApp, helper: s.prefInAppHelper },
        { key: "telegram", label: s.prefTelegram, helper: s.prefTelegramHelper },
        { key: "newApplications", label: s.prefNewApps, helper: s.prefNewAppsHelper },
        { key: "statusChanges", label: s.prefStatus, helper: s.prefStatusHelper },
        { key: "interviews", label: s.prefInterviews, helper: s.prefInterviewsHelper },
        { key: "aiRecommendations", label: s.prefAi, helper: s.prefAiHelper },
      ],
      [s],
    );
  const currentUser = useQuery(api.users.getSelf);
  const createTelegramLink = useAction(api.telegramLinking.createLink);
  const updatePreferences = useMutation(api.users.updateNotificationPreferences);
  const unlinkTelegram = useMutation(api.users.unlinkTelegram);
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);

  const preferences = useMemo(
    () => draft ?? mergeNotificationPreferences(currentUser?.notificationPreferences),
    [currentUser?.notificationPreferences, draft],
  );

  useEffect(() => {
    let cancelled = false;
    if (currentUser === undefined || currentUser?.isBotLinked) {
      setTelegramLink(null);
      setTelegramLinkLoading(false);
      return;
    }

    setTelegramLinkLoading(true);
    void createTelegramLink({ botUrl: getTelegramBotUrl(import.meta.env) })
      .then((link) => {
        if (!cancelled) setTelegramLink(link.url);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : s.telegramLinkError);
        }
      })
      .finally(() => {
        if (!cancelled) setTelegramLinkLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [createTelegramLink, currentUser?._id, currentUser?.isBotLinked, s.telegramLinkError]);

  if (currentUser === undefined) return <LoadingSkeleton variant="page" />;

  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "JumysAI";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const dirty = JSON.stringify(preferences) !== JSON.stringify(mergeNotificationPreferences(currentUser?.notificationPreferences));

  async function save() {
    setSaving(true);
    try {
      await updatePreferences({ preferences });
      setDraft(null);
      toast.success(s.savedToast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : s.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function disconnectTelegram() {
    try {
      await unlinkTelegram({});
      setTelegramLink(null);
      toast.success(s.telegramUnlinkedToast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : s.telegramUnlinkError);
    }
  }

  return (
    <>
      <PageHeader title={s.pageTitle} subtitle={s.pageSubtitle} />
      <div className="container-app grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border bg-card">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">{s.account}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.accountBody}</p>
          </div>
          <div className="grid gap-5 p-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarImage src={user?.imageUrl} alt={name} />
                <AvatarFallback>{initials || "JA"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress ?? s.noEmail}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone="info">{currentUser?.role ?? s.noRole}</Badge>
                  <Badge tone="muted">{s.cityBadge}</Badge>
                </div>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3 rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <TelegramLogo weight="bold" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{s.telegramSection}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.isBotLinked
                      ? `${s.telegramLinkedPrefix}${currentUser.telegramUsername ? ` @${currentUser.telegramUsername}` : ""}`
                      : s.telegramUnlinked}
                  </p>
                  {currentUser?.telegramUsername ? (
                    <p className="mt-1 text-xs text-muted-foreground">@{currentUser.telegramUsername}</p>
                  ) : null}
                </div>
                <Badge tone={currentUser?.isBotLinked ? "success" : "muted"} className="ml-auto">
                  {currentUser?.isBotLinked ? s.telegramLinked : s.telegramUnlinked}
                </Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{s.telegramHelper}</p>
              <div className="flex flex-wrap gap-2">
                {currentUser?.isBotLinked ? (
                  <ConfirmDialog
                    label={s.telegramDisconnect}
                    title={s.telegramDisconnectTitle}
                    body={s.telegramDisconnectBody}
                    onConfirm={disconnectTelegram}
                    variant="destructive"
                  />
                ) : telegramLink ? (
                  <Button
                    render={<a href={telegramLink} target="_blank" rel="noreferrer" />}
                    type="button"
                  >
                    <TelegramLogo data-icon="inline-start" weight="bold" />
                    {s.telegramConnect}
                  </Button>
                ) : (
                  <Button type="button" disabled>
                    {telegramLinkLoading ? <Spinner data-icon="inline-start" /> : null}
                    {telegramLinkLoading ? s.telegramPreparing : s.telegramConnect}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-lg border bg-card">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">{s.notificationPrefsTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.notificationPrefsBody}</p>
          </div>
          <div className="divide-y">
            {preferenceLabels.map((item) => (
              <label key={item.key} className="flex cursor-pointer items-start justify-between gap-4 p-4">
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.helper}</span>
                </span>
                <Switch
                  checked={preferences[item.key]}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...preferences,
                      [item.key]: checked,
                    })
                  }
                  aria-label={item.label}
                />
              </label>
            ))}
          </div>
        </aside>
      </div>
      <ActionFooter meta={dirty ? s.footerDirty : s.footerClean}>
        <Button type="button" variant="outline" disabled={!dirty || saving} onClick={() => setDraft(DEFAULT_NOTIFICATION_PREFERENCES)}>
          {s.resetDefaults}
        </Button>
        <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? <Spinner data-icon="inline-start" /> : <UserCircle data-icon="inline-start" weight="bold" />}
          {saving ? s.saving : s.save}
        </Button>
      </ActionFooter>
    </>
  );
}
