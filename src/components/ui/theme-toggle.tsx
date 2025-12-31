import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/theme-store";

export function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = () => {
    setMode(isDark ? "light" : "dark");
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
