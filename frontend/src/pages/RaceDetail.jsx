import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getUsers } from "../api/users";
import { getRace, getResults, checkInToRace, saveResult, deleteResult, updateRace } from "../api/races";
import { useServerDown } from "../api/serverStatus";
import PageLoading from "../components/ui/PageLoading";
import CheckInRoster from "../components/ui/CheckInRoster";
import DseSubmittedButton from "../components/ui/DseSubmittedButton";
import { formatTimeInput } from "../utils/format";
import { checkInOrigin } from "../utils/network";
import "./RaceDetail.css";

const TYPE_LABELS = { road_xc: "Road / XC", track: "Track" };

function toResultMap(resultsList) {
  return Object.fromEntries(resultsList.map((r) => [r.user_id, r]));
}

export default function RaceDetail() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  const [race, setRace] = useState(null);
  const [members, setMembers] = useState([]);
  const [results, setResults] = useState({});   // { userId: resultObj }
  const [timeInputs, setTimeInputs] = useState({}); // { userId: string }
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [checkinError, setCheckinError] = useState("");
  const serverDown = useServerDown();

  useEffect(() => {
    Promise.all([getRace(raceId), getUsers(), getResults(raceId)])
      .then(([raceData, users, resultsList]) => {
        setRace(raceData);
        setMembers(users);
        setResults(toResultMap(resultsList));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [raceId]);

  async function toggleAttendance(userId) {
    const existing = results[userId];
    if (existing?.time_display && !window.confirm("Remove this check-in? The recorded finish time will be deleted too.")) return;
    setCheckinError("");
    try {
      if (existing) {
        await deleteResult(raceId, userId);
        setResults((prev) => { const next = { ...prev }; delete next[userId]; return next; });
        setTimeInputs((prev) => { const next = { ...prev }; delete next[userId]; return next; });
      } else {
        const saved = await checkInToRace(raceId, userId);
        setResults((prev) => ({ ...prev, [userId]: saved }));
      }
    } catch (err) {
      // Someone else (usually a QR self check-in) got there first, so resync the list.
      if (err.message === "Member already checked in" || err.message === "Member already checked out") {
        getResults(raceId).then((list) => setResults(toResultMap(list))).catch(() => {});
      }
      setCheckinError(err.message || "Failed to update attendance.");
    }
  }

  async function handleMemberCreated(user) {
    const saved = await checkInToRace(raceId, user.id);
    setMembers((prev) => [...prev, user]);
    setResults((prev) => ({ ...prev, [user.id]: saved }));
  }

  async function handleSaveTime(userId) {
    const time = (timeInputs[userId] || "").trim();
    if (!time) return;
    setSaving((s) => ({ ...s, [userId]: true }));
    try {
      const saved = await saveResult(raceId, { race_id: raceId, user_id: userId, time_display: time });
      setResults((prev) => ({ ...prev, [userId]: saved }));
      setTimeInputs((prev) => { const next = { ...prev }; delete next[userId]; return next; });
    } catch (err) {
      setCheckinError(err.message || "Failed to save time.");
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
    }
  }

  function renderTimeControls(member) {
    const result = results[member.id];
    const isSaving = saving[member.id];
    return (
      <div className="race-time-cell">
        {member.id in timeInputs ? (
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
      </div>
    );
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

  const checkedInIds = Object.keys(results);

  if (loading || (!race && serverDown)) return <PageLoading />;
  if (!race) return <div className="page-loading">Race not found.</div>;

  return (
    <div className="race-detail">
      {submitted && (
        <div className="submit-banner">✓ Race results submitted successfully!</div>
      )}

      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

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
        <DseSubmittedButton session={race} type="race" onSaved={setRace} />
      </div>

      <div className="attendance-summary">
        <div className="summary-stat">
          <div className="summary-value">{checkedInIds.length}</div>
          <div className="summary-label">Checked In</div>
        </div>
        <div className="summary-divider" />
        <button
          className={`summary-submit-btn${!race.is_live ? " submitted" : ""}`}
          disabled={!race.is_live}
          onClick={async () => {
            setCheckinError("");
            try {
              await updateRace(raceId, { is_live: false });
              setSubmitted(true);
              setTimeout(() => navigate("/"), 1500);
            } catch (err) {
              setCheckinError(err.message || "Failed to submit attendance.");
            }
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

      <CheckInRoster
        members={members}
        checkedInIds={checkedInIds}
        onToggle={toggleAttendance}
        onMemberCreated={handleMemberCreated}
        error={checkinError}
        renderCheckedExtra={renderTimeControls}
        toolbar={checkedInIds.length > 0 && (
          <button className="export-btn" onClick={exportRace}>⬇ Export results</button>
        )}
      />
    </div>
  );
}
