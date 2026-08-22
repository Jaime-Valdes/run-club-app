import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClub } from "../context/ClubContext";
import { getRuns } from "../api/runs";
import { getRaces } from "../api/races";
import PageLoading from "../components/ui/PageLoading";
import EditRunModal from "../components/ui/EditRunModal";
import EditRaceModal from "../components/ui/EditRaceModal";
import { deleteRunWithConfirm } from "../utils/runActions";
import { deleteRaceWithConfirm } from "../utils/raceActions";
import logo from "../assets/logo.svg";
import "./Home.css";

export default function Home() {
  const { club, loading: clubLoading } = useClub();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRun, setEditingRun] = useState(null);
  const [editingRace, setEditingRace] = useState(null);

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

  const liveSessions = sessions.filter((s) => s.is_live);
  const pastSessions = sessions.filter((s) => !s.is_live);

  function handleRunSaved(updated) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...updated, type: "practice" } : s)));
  }

  function handleRaceSaved(updated) {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...updated, type: "race" } : s)));
  }

  async function handleDeleteSession(item, e) {
    e.stopPropagation();
    const confirmed = item.type === "race" ? await deleteRaceWithConfirm(item) : await deleteRunWithConfirm(item);
    if (confirmed) {
      setSessions((prev) => prev.filter((s) => s.id !== item.id));
    }
  }

  if (clubLoading) return <PageLoading />;

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
      </div>

      <button className="start-btn" onClick={() => navigate("/attendance")}>
        Start Attendance Session
      </button>

      {!loading && liveSessions.length > 0 && (
        <div className="live-section">
          <h2 className="section-title live-section-title">
            <span className="live-dot" /> Live Now
          </h2>
          {liveSessions.map((item) => (
            <div
              key={item.id}
              className="live-card"
              onClick={() => navigate(item.type === "race" ? `/race/${item.id}` : `/attendance?run_id=${item.id}`)}
            >
              <div className="live-card-left">
                <div className="live-badge">● LIVE {item.type === "race" ? "· Race" : "· Practice"}</div>
                <div className="live-card-title">{item.title}</div>
                <div className="live-card-meta">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    weekday: "long", month: "short", day: "numeric",
                  })}
                  {item.type === "practice" && item.notes && ` · ${item.notes}`}
                  {item.type === "race" && item.distance && ` · ${item.distance}`}
                </div>
              </div>
              <div className="live-card-cta">Join →</div>
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="row-icon-btn"
                  onClick={() => (item.type === "race" ? setEditingRace(item) : setEditingRun(item))}
                  title="Edit"
                >
                  ✎
                </button>
                <button className="row-icon-btn row-icon-danger" onClick={(e) => handleDeleteSession(item, e)} title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sessions-section">
        <h2 className="section-title">Past Sessions</h2>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : pastSessions.length === 0 && liveSessions.length === 0 ? (
          <p className="muted">No sessions yet. Start your first one!</p>
        ) : pastSessions.length === 0 ? null : (
          <div className="session-list">
            {pastSessions.map((item) => (
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
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="row-icon-btn"
                    onClick={() => (item.type === "race" ? setEditingRace(item) : setEditingRun(item))}
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button className="row-icon-btn row-icon-danger" onClick={(e) => handleDeleteSession(item, e)} title="Delete">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingRun && (
        <EditRunModal run={editingRun} onClose={() => setEditingRun(null)} onSaved={handleRunSaved} />
      )}
      {editingRace && (
        <EditRaceModal race={editingRace} onClose={() => setEditingRace(null)} onSaved={handleRaceSaved} />
      )}
    </div>
  );
}
