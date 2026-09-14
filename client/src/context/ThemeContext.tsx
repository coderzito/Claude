import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, type Theme } from "../theme";
import { usePreferences } from "./PreferencesContext";

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePreferences();
  const systemScheme = useColorScheme();

  const resolvedMode = prefs.themeMode === "system" ? (systemScheme ?? "dark") : prefs.themeMode;
  const theme = resolvedMode === "light" ? lightTheme : darkTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
