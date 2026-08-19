"use client";

import React, { createContext, useContext, useState } from "react";

/** Where the reader's explicit theme choice is kept between visits. */
export const THEME_KEY = "dunelock:theme";

/**
 * Theme state. Dark is the default, and it is the value both the server render
 * and the first client render use, which is what keeps hydration honest: the
 * server cannot know a reader's saved choice, so nothing may depend on it until
 * after hydration. The saved choice is read in components/providers.tsx, inside
 * the Suspense boundary its consumers live in, and applied there.
 *
 * The pre-paint script in app/layout.tsx has already put the right class on
 * <html>, so the correct theme is painted before React runs either way.
 */
const ThemeContext = createContext<{
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}>({
  isLightMode: false, // Dark is the default
  setIsLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isLightMode, setIsLightMode] = useState(false);

  const choose = (val: boolean) => {
    setIsLightMode(val);
    try {
      localStorage.setItem(THEME_KEY, val ? "light" : "dark");
    } catch {
      /* private mode: the choice lasts for this session only */
    }
  };

  return (
    <ThemeContext.Provider value={{ isLightMode, setIsLightMode: choose }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
