import type { AiChatMessage } from "./aiSearchTypes";

export function AiMessageBubble({ message }: { message: AiChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground shadow-[0_12px_24px_rgba(217,75,22,0.18)]"
            : "max-w-[85%] rounded-2xl rounded-bl-md border bg-card px-4 py-2.5 text-sm leading-6 text-foreground shadow-sm"
        }
      >
        {message.content}
      </div>
    </div>
  );
}
