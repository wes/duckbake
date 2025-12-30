import { Routes, Route } from "react-router-dom";
import { HomePage, ProjectPage } from "@/pages";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/project/:id" element={<ProjectPage />} />
    </Routes>
  );
}

export default App;
