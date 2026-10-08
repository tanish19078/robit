import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Theme: "system" | "light" | "dark".
 *
 * "system" stamps no data-theme attribute at all, which lets the
 * prefers-color-scheme block in tokens.css apply. An explicit choice stamps
 * data-theme on <html>, which outranks the media query in both directions.
 *
 * localStorage is wrapped because it throws in private-mode Safari and when
 * site data is blocked. A failed read or write only costs the remembered
 * preference; the app still renders in the OS theme.
 */

const KEY = "prahari-theme";
const ORDER = ["system", "light", "dark"];

const ThemeCtx = createContext({ theme: "system", resolved: "light", cycle: () => {} });

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return ORDER.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStored);
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Track the OS setting so the label reads correctly while theme === "system".
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* preference just won't persist */
    }
  }, [theme]);

  const cycle = useCallback(
    () => setTheme((t) => ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]),
    []
  );

  const value = useMemo(
    () => ({ theme, resolved: theme === "system" ? (systemDark ? "dark" : "light") : theme, cycle }),
    [theme, systemDark, cycle]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
