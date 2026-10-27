import { Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar.jsx";
import Home from "./pages/Home.jsx";
import Explorer from "./pages/Explorer.jsx";
import Calendar from "./pages/Calendar.jsx";
import SensorLab from "./pages/SensorLab.jsx";
import Studio from "./pages/Studio.jsx";
import Formulas from "./pages/Formulas.jsx";
import Validation from "./pages/Validation.jsx";
import Sources from "./pages/Sources.jsx";
import BlindSpot from "./pages/BlindSpot.jsx";
import Learn from "./pages/Learn.jsx";
import Workspace from "./pages/Workspace.jsx";
import Brief from "./pages/Brief.jsx";
import Health from "./pages/Health.jsx";
import NotFound from "./pages/NotFound.jsx";

function DataShell() {
  return (
    <div className="app">
      <TopBar />
      <main className="main">
        <Routes>
          <Route path="/explore" element={<Explorer />} />
          <Route path="/calendar/:region" element={<Calendar />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/sensors" element={<SensorLab />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/formulas/:id" element={<Formulas />} />
          <Route path="/formulas" element={<Formulas />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/blind-spot" element={<BlindSpot />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/me" element={<Workspace />} />
          <Route path="/brief/:id" element={<Brief />} />
          <Route path="/brief" element={<Brief />} />
          <Route path="/sources/health" element={<Health />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/*" element={<DataShell />} />
    </Routes>
  );
}
