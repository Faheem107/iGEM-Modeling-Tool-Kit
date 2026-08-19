"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

/** Where the reader's explicit theme choice is kept between visits. */
export const THEME_KEY = "dunelock:theme";

const ThemeContext = createContext<{
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}>({
  isLightMode: false, // Dark is the default
  setIsLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise to dark, matching the `dark` class app/layout.tsx ships on
  // <html>, so the first server paint already uses the dark tokens and there is
  // no light flash before hydration. A reader who has chosen light gets it back
  // from the pre-paint script in the layout; the effect below catches React up.
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(THEME_KEY) === "light") setIsLightMode(true);
    } catch {
      /* private mode: stay on the default */
    }
  }, []);

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
