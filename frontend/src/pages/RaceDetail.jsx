import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getUsers } from "../api/users";
import { getRace, getResults, saveResult, deleteResult } from "../api/races";
import "./RaceDetail.css";

const TYPE_LABELS = { road_xc: "Road / XC", track: "Track" };

export default function RaceDetail() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  const [race, setRace] = useState(null);
  const [members, setMembers] = useState([]);
  const [results, setResults] = useState({});   // { userId: resultObj }
  const [timeInputs, setTimeInputs] = useState({}); // { userId: string }
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([getRace(raceId), getUsers(), getResults(raceId)])
      .then(([raceData, users, resultsList]) => {
        setRace(raceData);
        setMembers(users);
        const map = {};
        resultsList.forEach((r) => { map[r.user_id] = r; });
        setResults(map);
      })
      .finally(() => setLoading(false));
  }, [raceId]);

  async function handleCheckIn(userId) {
    setSaving((s) => ({ ...s, [userId]: true }));
    try {
      const saved = await saveResult(raceId, { race_id: raceId, user_id: userId, time_display: null });
      setResults((prev) => ({ ...prev, [userId]: saved }));
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
    }
  }

  async function handleCheckOut(userId) {
    await deleteResult(raceId, userId);
    setResults((prev) => { const next = { ...prev }; delete next[userId]; return next; });
    setTimeInputs((prev) => { const next = { ...prev }; delete next[userId]; return next; });
  }

  async function handleSaveTime(userId) {
    const time = (timeInputs[userId] || "").trim();
    if (!time) return;
    setSaving((s) => ({ ...s, [userId]: true }));
    try {
      const saved = await saveResult(raceId, { race_id: raceId, user_id: userId, time_display: time });
      setResults((prev) => ({ ...prev, [userId]: saved }));
      setTimeInputs((prev) => { const next = { ...prev }; delete next[userId]; return next; });
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
    }
  }

  const attending = Object.keys(results).length;

  const filtered = members
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => showAll || results[m.id]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!race) return <div className="page-loading">Race not found.</div>;

  return (
    <div className="race-detail">
      {submitted && (
        <div className="submit-banner">✓ Race results submitted successfully!</div>
      )}

      <button className="back-btn" onClick={() => navigate("/attendance")}>← Back</button>

      <div className="race-header card">
        <div className="race-type-badge">{TYPE_LABELS[race.race_type] || race.race_type}</div>
        <h1 className="race-title">{race.title}</h1>
        <div className="race-meta-row">
          <span>{new Date(race.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <span className="race-dot">·</span>
          <span>{race.distance}</span>
          {race.location && <><span className="race-dot">·</span><span>{race.location}</span></>}
        </div>
        <div className="race-summary-row">
          <span className="race-attending-count">{attending} attending</span>
          <span className="race-dot">·</span>
          <span className="race-times-count">
            {Object.values(results).filter((r) => r.time_display).length} times entered
          </span>
        </div>
      </div>

      <div className="race-filter-row">
        <button className={`filter-pill ${showAll ? "active" : ""}`} onClick={() => setShowAll(true)}>
          All Members
        </button>
        <button className={`filter-pill ${!showAll ? "active" : ""}`} onClick={() => setShowAll(false)}>
          Attending ({attending})
        </button>
      </div>

      <input
        className="search-input"
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card">
        {filtered.length === 0 ? (
          <p className="empty-state">{showAll ? "No members found" : "No one checked in yet"}</p>
        ) : (
          filtered.map((member) => {
            const result = results[member.id];
            const isEditing = member.id in timeInputs;
            const isSaving = saving[member.id];
            const attending = !!result;

            return (
              <div key={member.id} className={`result-row ${attending ? "attending" : ""}`}>
                <div className={`member-avatar ${attending ? "attending-avatar" : ""}`}>
                  {member.name[0].toUpperCase()}
                </div>
                <div className="result-info">
                  <div className="result-name">{member.name}</div>
                </div>

                <div className="result-actions">
                  {!attending ? (
                    <button
                      className="checkin-pill"
                      onClick={() => handleCheckIn(member.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? "..." : "Check In"}
                    </button>
                  ) : (
                    <>
                      {isEditing ? (
                        <div className="time-entry">
                          <input
                            className="time-input"
                            placeholder="e.g. 18:42"
                            autoFocus
                            value={timeInputs[member.id]}
                            onChange={(e) => setTimeInputs((p) => ({ ...p, [member.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTime(member.id);
                              if (e.key === "Escape") setTimeInputs((p) => { const n = { ...p }; delete n[member.id]; return n; });
                            }}
                          />
                          <button className="time-save-btn" onClick={() => handleSaveTime(member.id)} disabled={isSaving}>
                            {isSaving ? "…" : "Save"}
                          </button>
                          <button className="time-cancel-btn" onClick={() => setTimeInputs((p) => { const n = { ...p }; delete n[member.id]; return n; })}>✕</button>
                        </div>
                      ) : result.time_display ? (
                        <div className="time-saved">
                          <span className="time-display">{result.time_display}</span>
                          <button className="time-edit-btn" onClick={() => setTimeInputs((p) => ({ ...p, [member.id]: result.time_display }))}>Edit</button>
                        </div>
                      ) : (
                        <button className="add-time-btn" onClick={() => setTimeInputs((p) => ({ ...p, [member.id]: "" }))}>
                          + Time
                        </button>
                      )}
                      <span className="checked-badge">✓</span>
                      <button className="checkout-btn" onClick={() => handleCheckOut(member.id)} title="Remove">✕</button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        className="submit-session-btn"
        onClick={() => {
          setSubmitted(true);
          setTimeout(() => navigate("/"), 1500);
        }}
      >
        Submit Race ({attending} attending · {Object.values(results).filter((r) => r.time_display).length} times entered)
      </button>
    </div>
  );
}
