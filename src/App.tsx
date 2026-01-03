import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { HomePage, ProjectPage } from "@/pages";
import { UpdateBanner } from "@/components/settings";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useAppStore } from "@/stores";
import { useUpdateStore } from "@/stores/update-store";

function App() {
  const navigate = useNavigate();
  const setShowNewProjectDialog = useAppStore((s) => s.setShowNewProjectDialog);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);

  useEffect(() => {
    const unlistenNew = listen("menu-new-project", () => {
      navigate("/");
      setShowNewProjectDialog(true);
    });

    const unlistenOpen = listen("menu-open-project", () => {
      navigate("/");
    });

    const unlistenUpdates = listen("menu-check-for-updates", () => {
      checkForUpdates();
    });

    return () => {
      unlistenNew.then((fn) => fn());
      unlistenOpen.then((fn) => fn());
      unlistenUpdates.then((fn) => fn());
    };
  }, [navigate, setShowNewProjectDialog, checkForUpdates]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
      </Routes>
      <UpdateBanner />
    </ErrorBoundary>
  );
}

export default App;
