"use client";

import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}>({
  isLightMode: false,
  setIsLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isLightMode, setIsLightMode] = useState(false);

  return (
    <ThemeContext.Provider value={{ isLightMode, setIsLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
