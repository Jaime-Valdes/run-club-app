import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ClubProvider } from "./context/ClubContext";
import Navbar from "./components/layout/Navbar";
import Home from "./pages/Home";
import Attendance from "./pages/Attendance";
import Records from "./pages/Records";
import SelfCheckIn from "./pages/SelfCheckIn";
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
              <Route path="/selfcheckin" element={<SelfCheckIn />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ClubProvider>
  );
}
