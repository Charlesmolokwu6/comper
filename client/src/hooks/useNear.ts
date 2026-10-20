import { useCallback, useState } from "react";
import type { Near } from "@/components/compare/NearPicker";

const NEAR_KEY = "compare.near";

/** Per-city "boarding near" choices, remembered on this device only. */
function load(): Record<string, Near> {
  try {
    const v = JSON.parse(localStorage.getItem(NEAR_KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function useNear() {
  const [byCity, setByCity] = useState(load);
  const setNear = useCallback((city: string, near: Near | null) => {
    setByCity(prev => {
      const next = { ...prev };
      if (near) next[city] = near;
      else delete next[city];
      try {
        localStorage.setItem(NEAR_KEY, JSON.stringify(next));
      } catch {
        // Storage can be blocked; the choice still applies for this visit.
      }
      return next;
    });
  }, []);
  return {
    nearFor: (city: string | null) => (city ? (byCity[city] ?? null) : null),
    setNear,
  };
}
