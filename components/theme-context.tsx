"use client";

import React, { createContext, useContext, useState } from "react";

const ThemeContext = createContext<{
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}>({
  isLightMode: true, // Set to true by default
  setIsLightMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize state to true so the site loads in Light Mode instantly
  const [isLightMode, setIsLightMode] = useState(true); 

  return (
    <ThemeContext.Provider value={{ isLightMode, setIsLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);