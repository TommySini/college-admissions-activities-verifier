'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ColorScheme {
  primary: string;
  tertiary: string;
  accent: string;
}

const defaultColors: ColorScheme = {
  primary: '#7d95b9',
  tertiary: '#a4c4e0',
  accent: '#c2dcf2',
};

const ColorContext = createContext<ColorScheme>(defaultColors);

export function ColorProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ColorScheme>(defaultColors);

  useEffect(() => {
    // Fetch colors from API
    fetch('/api/settings/colors')
      .then((res) => res.json())
      .then((data) => {
        if (data.colors) {
          setColors(data.colors);
        }
      })
      .catch((err) => {
        console.error('Error fetching colors:', err);
      });
  }, []);

  return <ColorContext.Provider value={colors}>{children}</ColorContext.Provider>;
}

export function useColors() {
  return useContext(ColorContext);
}
