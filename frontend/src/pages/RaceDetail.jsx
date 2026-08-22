import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getUsers } from "../api/users";
import { getRace, getResults, saveResult, deleteResult, updateRace } from "../api/races";
import PageLoading from "../components/ui/PageLoading";
import { formatTimeInput } from "../utils/format";
import { checkInOrigin } from "../utils/network";
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

  function exportRace() {
    const attendingMembers = members.filter((m) => results[m.id]);
    const rows = attendingMembers.map((member) => {
      const parts = member.name.trim().split(" ");
      const result = results[member.id];
      return {
        "First Name": parts[0],
        "Last Name": parts.slice(1).join(" "),
        "Finish Time": result.time_display || "—",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    const safeName = (race.title || "race").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    XLSX.writeFile(wb, `${safeName}-results.xlsx`);
  }

  const attending = Object.keys(results).length;

  const filtered = members
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => showAll || results[m.id]);

  if (loading) return <PageLoading />;
  if (!race) return <div className="page-loading">Race not found.</div>;

  return (
    <div className="race-detail">
      {submitted && (
        <div className="submit-banner">✓ Race results submitted successfully!</div>
      )}

      <button className="back-btn" onClick={() => navigate("/attendance")}>← Back</button>

      <div className="race-header">
        <div className="race-type-badge">{TYPE_LABELS[race.race_type] || race.race_type}</div>
        <div className="race-title-row">
          <h1 className="race-title">{race.title}</h1>
          {race.is_live && <span className="race-live-badge">● LIVE</span>}
        </div>
        <div className="race-meta-row">
          <span>{new Date(race.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
          <span className="race-dot">·</span>
          <span>{race.distance}</span>
          {race.location && <><span className="race-dot">·</span><span>{race.location}</span></>}
        </div>
      </div>

      <div className="race-summary-bar">
        <div className="race-summary-stat">
          <div className="race-summary-value">{attending}</div>
          <div className="race-summary-label">Attending</div>
        </div>
        <div className="race-summary-divider" />
        <button
          className={`summary-submit-btn${!race.is_live ? " submitted" : ""}`}
          disabled={!race.is_live}
          onClick={async () => {
            await updateRace(raceId, { is_live: false });
            setSubmitted(true);
            setTimeout(() => navigate("/"), 1500);
          }}
        >
          <div className="summary-submit-label">
            {race.is_live ? "Submit Attendance" : "✓ Attendance Submitted"}
          </div>
        </button>
      </div>

      <div className="qr-card card">
        <div className="qr-label">Please scan to check in!</div>
        <QRCodeSVG
          value={`${checkInOrigin}/selfcheckin?race_id=${raceId}`}
          size={160}
          fgColor="#57068c"
          level="M"
        />
      </div>

      <div className="race-filter-row">
        <button className={`filter-pill ${showAll ? "active" : ""}`} onClick={() => setShowAll(true)}>
          All Members
        </button>
        <button className={`filter-pill ${!showAll ? "active" : ""}`} onClick={() => setShowAll(false)}>
          Attending ({attending})
        </button>
        {attending > 0 && (
          <button className="export-btn" onClick={exportRace}>⬇ Export results</button>
        )}
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
                            placeholder="16:54"
                            autoFocus
                            value={timeInputs[member.id]}
                            onChange={(e) => setTimeInputs((p) => ({ ...p, [member.id]: formatTimeInput(e.target.value) }))}
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

    </div>
  );
}
