import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClubProvider } from "./context/ClubContext";
import Navbar from "./components/layout/Navbar";
import Home from "./pages/Home";
import Attendance from "./pages/Attendance";
import Records from "./pages/Records";
import RaceRecords from "./pages/RaceRecords";
import SelfCheckIn from "./pages/SelfCheckIn";
import RaceDetail from "./pages/RaceDetail";
import "./App.css";

export default function App() {
  return (
    <ClubProvider>
      <BrowserRouter>
        <div className="app">
          <Navbar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/records" element={<Records />} />
              <Route path="/races" element={<RaceRecords />} />
              <Route path="/selfcheckin" element={<SelfCheckIn />} />
              <Route path="/race/:raceId" element={<RaceDetail />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ClubProvider>
  );
}
