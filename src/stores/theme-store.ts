import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeStyle = "glass" | "mono" | "kodama" | "catppuccin";

interface ThemeState {
  mode: ThemeMode;
  style: ThemeStyle;
  setMode: (mode: ThemeMode) => void;
  setStyle: (style: ThemeStyle) => void;
  initialize: () => void;
}

const getSystemPrefersDark = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const applyTheme = (mode: ThemeMode, style: ThemeStyle) => {
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("dark", "light", "theme-glass", "theme-mono", "theme-kodama", "theme-catppuccin");

  // Apply mode
  const isDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  if (isDark) {
    root.classList.add("dark");
  }

  // Apply style
  root.classList.add(`theme-${style}`);
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "dark",
  style: "glass",

  setMode: (mode) => {
    localStorage.setItem("theme-mode", mode);
    applyTheme(mode, get().style);
    set({ mode });
  },

  setStyle: (style) => {
    localStorage.setItem("theme-style", style);
    applyTheme(get().mode, style);
    set({ style });
  },

  initialize: () => {
    const savedMode = localStorage.getItem("theme-mode") as ThemeMode | null;
    const savedStyle = localStorage.getItem("theme-style") as ThemeStyle | null;

    // Migration: check for old theme preference
    const oldTheme = localStorage.getItem("theme");

    const mode = savedMode || (oldTheme === "light" ? "light" : "dark");
    const style = savedStyle || "glass";

    applyTheme(mode, style);
    set({ mode, style });

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const currentMode = get().mode;
      if (currentMode === "system") {
        applyTheme(currentMode, get().style);
      }
    });
  },
}));

// Theme metadata for the UI
export const themeStyles: { id: ThemeStyle; name: string; description: string }[] = [
  {
    id: "glass",
    name: "Glass",
    description: "Clean, modern Apple-inspired glass aesthetic",
  },
  {
    id: "mono",
    name: "Mono",
    description: "Minimal monochrome with sharp edges",
  },
  {
    id: "kodama",
    name: "Kodama",
    description: "Warm, earthy tones with serif typography",
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    description: "Soothing pastel colors with soft shadows",
  },
];

export const themeModes: { id: ThemeMode; name: string }[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "system", name: "System" },
];
