import type { ReactNode } from "react";

import { StateBlock } from "@/components/feedback/StateBlock";

export function ActionEmptyState({
  title,
  body,
  action,
  secondaryAction,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <StateBlock
      title={title}
      body={body}
      action={
        action || secondaryAction ? (
          <>
            {action}
            {secondaryAction}
          </>
        ) : undefined
      }
    />
  );
}
