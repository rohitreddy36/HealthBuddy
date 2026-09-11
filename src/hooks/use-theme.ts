import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "healthbuddy-theme";

type Theme = "light" | "dark";

/**
 * Reads the theme that's already been applied to <html> (see the inline
 * script in __root.tsx, which runs before paint to avoid a flash), and
 * lets the user flip it. The DOM/localStorage write happens inside
 * toggleTheme itself rather than in an effect, so mounting this hook never
 * mutates the class that was already correctly set before hydration.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // private browsing / storage disabled — theme just won't persist
      }
      return next;
    });
  }

  return { theme, toggleTheme } as const;
}
