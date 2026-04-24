export const motionPresets = {
  page: {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring", stiffness: 90, damping: 18, mass: 0.8 },
  },
  card: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring", stiffness: 110, damping: 20, mass: 0.7 },
  },
  list: {
    initial: "hidden",
    animate: "show",
    variants: {
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.055,
        },
      },
    },
  },
  listItem: {
    variants: {
      hidden: { opacity: 0, y: 14, scale: 0.985 },
      show: { opacity: 1, y: 0, scale: 1 },
    },
    transition: { type: "spring", stiffness: 120, damping: 22, mass: 0.75 },
  },
  button: {
    whileHover: { y: -1 },
    whileTap: { scale: 0.985, y: 0 },
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
} as const;

export function shouldReduceMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
