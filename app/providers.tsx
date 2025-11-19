"use client";

import { SessionProvider } from "next-auth/react";
import { ColorProvider } from "./context/ColorContext";
import { DarkModeProvider } from "./context/DarkModeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DarkModeProvider>
        <ColorProvider>{children}</ColorProvider>
      </DarkModeProvider>
    </SessionProvider>
  );
}

