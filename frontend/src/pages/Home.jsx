import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClub } from "../context/ClubContext";
import { getRuns } from "../api/runs";
import { getRaces } from "../api/races";
import logo from "../assets/logo.svg";
import "./Home.css";

export default function Home() {
  const { club, loading: clubLoading } = useClub();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    Promise.all([getRuns(club.id), getRaces(club.id)])
      .then(([runs, races]) => {
        const merged = [
          ...runs.map((r) => ({ ...r, type: "practice" })),
          ...races.map((r) => ({ ...r, type: "race" })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        setSessions(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [club]);

  if (clubLoading) return <div className="page-loading">Loading...</div>;

  if (!club) {
    return (
      <div className="no-club">
        <div className="no-club-icon">🏃</div>
        <h2>No club found</h2>
        <p>Create a club via the API to get started.</p>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-header">
        <img src={logo} alt="NYU Runners" className="home-logo" />
        <h1 className="home-title">NYU Run Club</h1>
        <p className="home-subtitle">New York University · Running Community</p>
      </div>

      <button className="start-btn" onClick={() => navigate("/attendance")}>
        Start Attendance Session
      </button>

      <div className="sessions-section">
        <h2 className="section-title">Past Sessions</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="muted">No sessions yet. Start your first one!</p>
        ) : (
          <div className="session-list">
            {sessions.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="session-item"
                onClick={() =>
                  item.type === "race"
                    ? navigate(`/race/${item.id}`)
                    : navigate(`/attendance?run_id=${item.id}`)
                }
              >
                <div className="session-info">
                  <div className="session-title-row">
                    <span className={`session-type-badge ${item.type}`}>
                      {item.type === "race" ? "Race" : "Practice"}
                    </span>
                    <span className="session-title">{item.title}</span>
                  </div>
                  <div className="session-meta">
                    {new Date(item.date).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric", year: "numeric",
                    })}
                    {item.type === "practice" && item.notes && ` · ${item.notes}`}
                    {item.type === "race" && item.distance && ` · ${item.distance}`}
                  </div>
                </div>
                <span className="session-chevron">›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
