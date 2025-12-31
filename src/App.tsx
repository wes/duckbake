import { Routes, Route } from "react-router-dom";
import { HomePage, ProjectPage } from "@/pages";
import { UpdateBanner } from "@/components/settings";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/project/:id" element={<ProjectPage />} />
      </Routes>
      <UpdateBanner />
    </>
  );
}

export default App;
