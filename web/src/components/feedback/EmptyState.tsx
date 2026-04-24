import type { ReactNode } from "react";

import { StateBlock } from "@/components/feedback/StateBlock";

export function EmptyState({
  title,
  body,
  action,
  visual = false,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  visual?: boolean;
}) {
  return <StateBlock title={title} body={body} action={action} className={visual ? "octagon-field" : undefined} />;
}
