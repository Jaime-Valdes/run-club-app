import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClub } from "../context/ClubContext";
import { getRuns } from "../api/runs";
import logo from "../assets/logo.svg";
import "./Home.css";

export default function Home() {
  const { club, loading: clubLoading } = useClub();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!club) return;
    getRuns(club.id)
      .then(setRuns)
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
        ) : runs.length === 0 ? (
          <p className="muted">No sessions yet. Start your first one!</p>
        ) : (
          <div className="session-list">
            {runs.map((run) => (
              <div
                key={run.id}
                className="session-item"
                onClick={() => navigate(`/attendance?run_id=${run.id}`)}
              >
                <div className="session-info">
                  <div className="session-title">{run.title}</div>
                  <div className="session-meta">
                    {new Date(run.date).toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric", year: "numeric",
                    })}
                    {run.notes && ` · ${run.notes}`}
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
