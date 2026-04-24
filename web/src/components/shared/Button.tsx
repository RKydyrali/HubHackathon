import type { ComponentProps } from "react";

import { Button as UiButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof UiButton>;

export function Button({ className, ...props }: ButtonProps) {
  return <UiButton className={cn("max-md:min-h-11", className)} {...props} />;
}
