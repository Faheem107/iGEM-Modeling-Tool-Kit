"use client";

import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}>({
  isLightMode: false, // Dark mode is the default
  setIsLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize to dark so the site loads in Dark Mode instantly. The <html> tag
  // in app/layout.tsx also ships the `dark` class so the first server paint is
  // dark (no light flash before hydration).
  const [isLightMode, setIsLightMode] = useState(false);

  return (
    <ThemeContext.Provider value={{ isLightMode, setIsLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
