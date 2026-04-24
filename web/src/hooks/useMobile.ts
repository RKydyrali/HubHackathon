import { useEffect, useState } from "react";

export const MOBILE_BREAKPOINT = 768;

export function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useMobile() {
  const [mobile, setMobile] = useState(isMobile());

  useEffect(() => {
    function onResize() {
      setMobile(isMobile());
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return mobile;
}
