import { NavLink, useLocation } from "react-router-dom";
import { useClub } from "../../context/ClubContext";
import logo from "../../assets/logo.svg";
import "./Navbar.css";

export default function Navbar() {
  const { club } = useClub();
  const { pathname } = useLocation();
  if (pathname === "/selfcheckin") return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <img src={logo} alt="" className="navbar-icon" />
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
            Att. Records
          </NavLink>
          <NavLink to="/races" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            Races
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
