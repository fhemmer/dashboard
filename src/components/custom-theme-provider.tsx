"use client";

import { getActiveCustomTheme } from "@/app/themes/actions";
import {
  applyThemeVariables,
  clearCustomThemeVariables,
  type ThemeVariables,
} from "@/lib/theme-utils";
import { isCustomTheme, makeCustomThemeName } from "@/modules/themes/types";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface CustomThemeContextValue {
  activeCustomThemeId: string | null;
  isLoading: boolean;
  applyCustomTheme: (id: string, lightVars: ThemeVariables, darkVars: ThemeVariables) => void;
  clearCustomTheme: () => void;
}

const CustomThemeContext = createContext<CustomThemeContextValue | null>(null);

export function useCustomTheme() {
  const context = useContext(CustomThemeContext);
  if (!context) {
    throw new Error("useCustomTheme must be used within CustomThemeProvider");
  }
  return context;
}

interface CustomThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages custom theme CSS variable injection.
 * Fetches the active custom theme on mount and applies variables to document.
 */
export function CustomThemeProvider({ children }: CustomThemeProviderProps) {
  const [activeCustomThemeId, setActiveCustomThemeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lightVariables, setLightVariables] = useState<ThemeVariables | null>(null);
  const [darkVariables, setDarkVariables] = useState<ThemeVariables | null>(null);

  // Fetch active custom theme on mount
  useEffect(() => {
    async function loadActiveTheme() {
      try {
        const theme = await getActiveCustomTheme();
        if (theme) {
          setActiveCustomThemeId(theme.id);
          setLightVariables(theme.light_variables);
          setDarkVariables(theme.dark_variables);

          // Store the custom theme reference in localStorage
          localStorage.setItem("theme-name", makeCustomThemeName(theme.id));
        }
      } catch (error) {
        console.error("Error loading active custom theme:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadActiveTheme();
  }, []);

  // Apply variables when theme or dark mode changes
  useEffect(() => {
    if (!activeCustomThemeId || !lightVariables || !darkVariables) {
      return;
    }

    const applyCurrentMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const variables = isDark ? darkVariables : lightVariables;
      applyThemeVariables(variables);
    };

    // Apply immediately
    applyCurrentMode();

    // Watch for dark mode changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          applyCurrentMode();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [activeCustomThemeId, lightVariables, darkVariables]);

  const applyCustomTheme = useCallback(
    (id: string, lightVars: ThemeVariables, darkVars: ThemeVariables) => {
      setActiveCustomThemeId(id);
      setLightVariables(lightVars);
      setDarkVariables(darkVars);
      localStorage.setItem("theme-name", makeCustomThemeName(id));
    },
    []
  );

  const clearCustomTheme = useCallback(() => {
    setActiveCustomThemeId(null);
    setLightVariables(null);
    setDarkVariables(null);
    clearCustomThemeVariables();

    // Check stored theme name and clear if it's a custom theme
    const stored = localStorage.getItem("theme-name");
    if (stored && isCustomTheme(stored)) {
      localStorage.setItem("theme-name", "default");
    }
  }, []);

  return (
    <CustomThemeContext.Provider
      value={{
        activeCustomThemeId,
        isLoading,
        applyCustomTheme,
        clearCustomTheme,
      }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
}
