"use client";

import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}>({
  isLightMode: true, // Light mode is the default
  setIsLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize to light so the site loads in Light Mode instantly. The <html>
  // tag in app/layout.tsx ships no `dark` class, so the first server paint uses
  // the light :root tokens (no dark flash before hydration).
  const [isLightMode, setIsLightMode] = useState(true);

  return (
    <ThemeContext.Provider value={{ isLightMode, setIsLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
