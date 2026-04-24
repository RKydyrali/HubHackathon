import { Link } from "react-router-dom";
import { NotePencil, Plus, Trash } from "@phosphor-icons/react";

import { SectionPanel } from "@/components/layout/SectionPanel";
import { Button } from "@/components/shared/Button";
import type { Doc } from "@/lib/convex-api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AiChatHistorySidebar({
  chats,
  activeChatId,
  basePath = "/ai-search",
  onNewChat,
  onRenameChat,
  onDeleteChat,
}: {
  chats: Array<Doc<"aiJobChats">> | undefined | null;
  activeChatId?: string | null;
  basePath?: string;
  onNewChat?: () => void;
  onRenameChat?: (chat: Doc<"aiJobChats">) => void;
  onDeleteChat?: (chat: Doc<"aiJobChats">) => void;
}) {
  const { copy } = useI18n();
  const newChatAction = onNewChat ? (
    <Button type="button" size="sm" onClick={onNewChat}>
      <Plus data-icon="inline-start" weight="bold" />
      New chat
    </Button>
  ) : (
    <Link className="text-xs font-medium text-primary hover:underline" to={basePath}>
      {copy.dashboard.startAi}
    </Link>
  );

  return (
    <SectionPanel
      title={copy.dashboard.continueAi}
      action={newChatAction}
      className="h-fit"
    >
      <div className="flex flex-col gap-2">
        {chats === undefined ? (
          <p className="text-sm text-muted-foreground">{copy.common.loading}</p>
        ) : chats && chats.length ? (
          chats.slice(0, 5).map((chat) => (
            <div
              key={chat._id}
              className={cn(
                "rounded-2xl border bg-background/72 p-2 text-sm transition-colors",
                activeChatId === chat._id ? "border-primary bg-primary/5" : "hover:border-primary",
              )}
            >
              <div className="flex items-start gap-2">
                <Link
                  to={`${basePath}/${chat._id}`}
                  aria-current={activeChatId === chat._id ? "page" : undefined}
                  className="min-w-0 flex-1 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate font-medium text-foreground">{chat.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {chat.matchedVacancyIds?.length ?? 0} {copy.nav.vacancies.toLowerCase()}
                  </span>
                </Link>
                {onRenameChat || onDeleteChat ? (
                  <div className="flex shrink-0 gap-1">
                    {onRenameChat ? (
                      <button
                        type="button"
                        aria-label={`Rename chat ${chat.title}`}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => onRenameChat(chat)}
                      >
                        <NotePencil weight="bold" />
                      </button>
                    ) : null}
                    {onDeleteChat ? (
                      <button
                        type="button"
                        aria-label={`Delete chat ${chat.title}`}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDeleteChat(chat)}
                      >
                        <Trash weight="bold" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{copy.ai.emptyPrompt}</p>
        )}
      </div>
    </SectionPanel>
  );
}
