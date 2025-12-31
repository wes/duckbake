import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeStore } from "@/stores/theme-store";
import { useUpdateStore } from "@/stores/update-store";
import App from "./App";
import "./index.css";

// Initialize theme before React renders to prevent flash
useThemeStore.getState().initialize();

// Check for updates on startup (with a small delay to not block initial render)
setTimeout(() => {
  useUpdateStore.getState().checkForUpdates();
}, 2000);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
