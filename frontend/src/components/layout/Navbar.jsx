import { NavLink, useLocation } from "react-router-dom";
import { useClub } from "../../context/ClubContext";
import "./Navbar.css";

export default function Navbar() {
  const { club } = useClub();
  const { pathname } = useLocation();
  if (pathname === "/selfcheckin") return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <span className="navbar-icon">🏃</span>
          <span>{club?.name || "Run Club"}</span>
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"} end>
            Home
          </NavLink>
          <NavLink to="/attendance" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Attendance
          </NavLink>
          <NavLink to="/records" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Records
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
