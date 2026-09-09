import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import IncidentQueue from "./pages/IncidentQueue";
import IncidentDetail from "./pages/IncidentDetail";
import FederationDemo from "./pages/FederationDemo";
import Architecture from "./pages/Architecture";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/incidents" element={<IncidentQueue />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/federation" element={<FederationDemo />} />
        <Route path="/architecture" element={<Architecture />} />
      </Routes>
    </>
  );
}
