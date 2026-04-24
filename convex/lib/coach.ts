type CoachProfile = {
  fullName: string;
  city: string;
  district?: string;
  skills: string[];
  resumeText?: string;
} | null;

type CoachApplication = {
  application: {
    status: string;
  };
  vacancy: {
    title: string;
    source: "native" | "hh";
  } | null;
};

type CoachMatch = {
  vacancy: {
    title: string;
    source: "native" | "hh";
  };
  matchScore: number;
};

export type StructuredCoach = {
  diagnosis: {
    level: "setup" | "building" | "active";
    summary: string;
    weakSignals: string[];
  };
  actionCards: Array<{
    title: string;
    reason: string;
    effort: "low" | "medium" | "high";
    cta: string;
    href: string;
  }>;
  checklist: Array<{
    id: string;
    label: string;
  }>;
  nextStep: {
    title: string;
    href: string;
  };
};

export function buildStructuredCoach(input: {
  profile: CoachProfile;
  applications: CoachApplication[];
  matches: CoachMatch[];
}): StructuredCoach {
  if (!input.profile) {
    return {
      diagnosis: {
        level: "setup",
        summary: "Create a profile so JumysAI can understand your skills and match you with Aktau vacancies.",
        weakSignals: ["Profile is missing", "Skills are not listed", "Resume text is not available"],
      },
      actionCards: [
        {
          title: "Fill in your profile",
          reason: "Matches and applications need your skills, city, and resume signal.",
          effort: "low",
          cta: "Open profile",
          href: "/app/seeker/profile",
        },
        {
          title: "Add 5-8 skills",
          reason: "Specific skills help employers quickly understand fit.",
          effort: "low",
          cta: "Edit skills",
          href: "/app/seeker/profile",
        },
        {
          title: "Write a short work summary",
          reason: "A concise summary makes your application easier to review.",
          effort: "medium",
          cta: "Add summary",
          href: "/app/seeker/profile",
        },
      ],
      checklist: [
        { id: "profile-name", label: "Add your full name" },
        { id: "profile-city", label: "Confirm Aktau city and district" },
        { id: "profile-skills", label: "List practical job skills" },
        { id: "profile-resume", label: "Paste or write resume text" },
      ],
      nextStep: {
        title: "Complete your seeker profile",
        href: "/app/seeker/profile",
      },
    };
  }

  const weakSignals: string[] = [];
  if (input.profile.skills.length < 3) {
    weakSignals.push("Add more concrete skills");
  }
  if (!input.profile.resumeText?.trim()) {
    weakSignals.push("Resume text is missing");
  }
  if (!input.profile.district?.trim()) {
    weakSignals.push("District is not selected");
  }
  if (input.applications.length === 0) {
    weakSignals.push("No applications submitted yet");
  }

  const activeApplications = input.applications.filter(({ application }) =>
    ["submitted", "reviewing", "interview"].includes(application.status),
  );
  const bestMatch = [...input.matches].sort((a, b) => b.matchScore - a.matchScore)[0];
  const level = activeApplications.length > 0 ? "active" : "building";

  return {
    diagnosis: {
      level,
      summary: `${input.profile.fullName} is ${level === "active" ? "actively moving through applications" : "ready to build a stronger search rhythm"} in ${input.profile.city}.`,
      weakSignals,
    },
    actionCards: [
      {
        title: "Sharpen your profile",
        reason: weakSignals.length > 0 ? weakSignals[0]! : "A clear profile keeps your match quality high.",
        effort: "low",
        cta: "Update profile",
        href: "/app/seeker/profile",
      },
      {
        title: bestMatch ? `Review ${bestMatch.vacancy.title}` : "Explore fresh vacancies",
        reason: bestMatch
          ? `This vacancy is currently your strongest visible match at ${bestMatch.matchScore}%.`
          : "A steady search habit improves your odds of finding local work.",
        effort: "medium",
        cta: "Open jobs",
        href: "/app/seeker/jobs",
      },
      {
        title: "Prepare one interview story",
        reason: "A short example about reliability, teamwork, or customer care helps in screening calls.",
        effort: "medium",
        cta: "Use checklist",
        href: "/app/seeker/coach",
      },
    ],
    checklist: [
      { id: "intro", label: "Practice a 30-second introduction" },
      { id: "availability", label: "Prepare your availability and preferred district" },
      { id: "experience", label: "Write one example from past work or study" },
      { id: "questions", label: "Prepare two questions for the employer" },
    ],
    nextStep: bestMatch
      ? { title: `Open matched vacancy: ${bestMatch.vacancy.title}`, href: "/app/seeker/matches" }
      : { title: "Find a native vacancy to apply in-app", href: "/app/seeker/jobs" },
  };
}
