"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface DarkModeContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  loading: boolean;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [darkMode, setDarkModeState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    const loadDarkMode = async () => {
      try {
        const res = await fetch("/api/settings/preferences");
        if (res.ok) {
          const data = await res.json();
          const isDarkMode = data.preferences?.darkMode === true;
          setDarkModeState(isDarkMode);
          // Apply to document
          if (isDarkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        } else {
          // Default to false
          setDarkModeState(false);
          document.documentElement.classList.remove("dark");
        }
      } catch (err) {
        console.error("Error loading dark mode:", err);
        setDarkModeState(false);
        document.documentElement.classList.remove("dark");
      } finally {
        setLoading(false);
      }
    };

    loadDarkMode();
  }, [status]);

  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);
    
    // Apply immediately
    if (value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Save to database
    try {
      await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ darkMode: value }),
      });
    } catch (err) {
      console.error("Error saving dark mode:", err);
    }
  };

  return (
    <DarkModeContext.Provider value={{ darkMode, setDarkMode, loading }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return context;
}

