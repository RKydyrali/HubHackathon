import {
  ArrowRight,
  ArrowSquareOut,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  DotsThree,
  FileText,
  Funnel,
  House,
  ListChecks,
  MagnifyingGlass,
  PencilSimple,
  Sparkle,
  SignOut,
  UserCircle,
  Users,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";

const iconsMap = {
  ArrowRight,
  ExternalLink: ArrowSquareOut,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  DotsThree,
  FileText,
  Funnel,
  House,
  ListChecks,
  MagnifyingGlass,
  PencilSimple,
  Sparkle,
  SignOut,
  UserCircle,
  Users,
  WarningCircle,
  XCircle,
} as const;

type IconProps = {
  icon: keyof typeof iconsMap;
  weight?: React.ComponentProps<typeof House>["weight"];
} & React.ComponentProps<"svg">;

export function Icon({ icon, ...props }: IconProps) {
  const Comp = iconsMap[icon];
  return <Comp {...props} />;
}

export type IconName = keyof typeof iconsMap;
