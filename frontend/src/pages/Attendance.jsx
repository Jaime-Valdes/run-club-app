import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useClub } from "../context/ClubContext";
import { getUsers } from "../api/users";
import { getRuns, createRun } from "../api/runs";
import { checkIn, checkOut, getAttendanceForRun } from "../api/attendance";
import { createRace } from "../api/races";
import { QRCodeSVG } from "qrcode.react";
import "./Attendance.css";

const RACE_DISTANCES = ["5k", "10k", "Half Marathon", "XC", "Track Meet"];

const networkHost = import.meta.env.VITE_NETWORK_HOST;
const checkInOrigin = networkHost
  ? `${window.location.protocol}//${networkHost}:${window.location.port}`
  : window.location.origin;

export default function Attendance() {
  const { club } = useClub();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRunId = searchParams.get("run_id");

  const [step, setStep] = useState(preselectedRunId ? "checkin" : "select");
  const [sessionType, setSessionType] = useState("practice");
  const [runs, setRuns] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const [newRun, setNewRun] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  const [newRace, setNewRace] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 16),
    distance: "5k",
    xcDistance: "",
    location: "",
  });

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!club) return;
    Promise.all([getRuns(club.id), getUsers()])
      .then(([runsData, users]) => {
        setRuns(runsData);
        setMembers(users);
        if (preselectedRunId) {
          const found = runsData.find((r) => r.id === preselectedRunId);
          if (found) setActiveRun(found);
        }
      })
      .finally(() => setLoading(false));
  }, [club, preselectedRunId]);

  useEffect(() => {
    if (!activeRun) return;
    getAttendanceForRun(activeRun.id).then((records) => {
      setAttendees(records.map((r) => r.user_id));
    });
  }, [activeRun]);

  async function handleCreateRun(e) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError("");
    try {
      const run = await createRun({ ...newRun, club_id: club.id });
      setActiveRun(run);
      setRuns((prev) => [run, ...prev]);
      setStep("checkin");
    } catch (err) {
      setCreateError(err.message || "Failed to create session. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRace(e) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError("");
    try {
      const distance = (newRace.distance === "XC" && newRace.xcDistance.trim())
        ? `XC ${newRace.xcDistance.trim()}`
        : newRace.distance;
      const race_type = distance === "Track Meet" ? "track" : "road_xc";
      const race = await createRace({
        ...newRace,
        distance,
        race_type,
        club_id: club.id,
      });
      navigate(`/race/${race.id}`);
    } catch (err) {
      setCreateError(err.message || "Failed to create race. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAttendance(userId) {
    const isCheckedIn = attendees.includes(userId);
    if (isCheckedIn) {
      await checkOut(activeRun.id, userId);
      setAttendees((prev) => prev.filter((id) => id !== userId));
    } else {
      await checkIn(activeRun.id, userId);
      setAttendees((prev) => [...prev, userId]);
    }
  }

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!club || loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="attendance">
      {step === "select" && (
        <>
          <h1 className="page-title">New Session</h1>

          <div className="tabs">
            <button
              className={`tab ${sessionType === "practice" ? "active" : ""}`}
              onClick={() => { setSessionType("practice"); setCreateError(""); }}
            >
              Practice
            </button>
            <button
              className={`tab ${sessionType === "race" ? "active" : ""}`}
              onClick={() => { setSessionType("race"); setCreateError(""); }}
            >
              Race
            </button>
          </div>

          {sessionType === "practice" && (
            <>
              <form className="run-form card" onSubmit={handleCreateRun}>
                <div className="form-group">
                  <label>Session Title</label>
                  <input
                    required
                    placeholder="e.g. Tuesday Track Workout"
                    value={newRun.title}
                    onChange={(e) => setNewRun({ ...newRun, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newRun.date}
                    onChange={(e) => setNewRun({ ...newRun, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input
                    placeholder="e.g. Meet at Palladium entrance"
                    value={newRun.notes}
                    onChange={(e) => setNewRun({ ...newRun, notes: e.target.value })}
                  />
                </div>
                <button className="btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create & Take Attendance →"}
                </button>
                {createError && <p className="form-error">{createError}</p>}
              </form>

              {runs.length > 0 && (
                <div className="section">
                  <h2 className="section-title">Or continue a recent practice</h2>
                  <div className="run-list card">
                    {runs.slice(0, 5).map((run) => (
                      <button
                        key={run.id}
                        className="run-item-btn"
                        onClick={() => { setActiveRun(run); setStep("checkin"); }}
                      >
                        <div>
                          <div className="run-title">{run.title}</div>
                          <div className="run-meta">
                            {new Date(run.date).toLocaleDateString("en-US", {
                              weekday: "short", month: "short", day: "numeric",
                            })}
                            {run.notes && ` · ${run.notes}`}
                          </div>
                        </div>
                        <span className="chevron">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {sessionType === "race" && (
            <form className="run-form card" onSubmit={handleCreateRace}>
              <div className="form-group">
                <label>Race Name</label>
                <input
                  required
                  placeholder="e.g. Cupid's Chase 5k"
                  value={newRace.title}
                  onChange={(e) => setNewRace({ ...newRace, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={newRace.date}
                  onChange={(e) => setNewRace({ ...newRace, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Distance</label>
                <select
                  value={newRace.distance}
                  onChange={(e) => setNewRace({ ...newRace, distance: e.target.value, xcDistance: "" })}
                >
                  {RACE_DISTANCES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              {newRace.distance === "XC" && (
                <div className="form-group">
                  <label>Specific Distance <span className="label-optional">(optional — e.g. 6k, 5k)</span></label>
                  <input
                    placeholder="e.g. 6k"
                    value={newRace.xcDistance}
                    onChange={(e) => setNewRace({ ...newRace, xcDistance: e.target.value })}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Location</label>
                <input
                  placeholder="e.g. Central Park, New York"
                  value={newRace.location}
                  onChange={(e) => setNewRace({ ...newRace, location: e.target.value })}
                />
              </div>
              <button className="btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Race & Take Attendance →"}
              </button>
              {createError && <p className="form-error">{createError}</p>}
            </form>
          )}
        </>
      )}

      {submitted && (
        <div className="submit-banner">✓ Session submitted successfully!</div>
      )}

      {step === "checkin" && activeRun && (
        <>
          <div className="checkin-header">
            <button className="back-btn" onClick={() => setStep("select")}>← Back</button>
            <h1 className="page-title">{activeRun.title}</h1>
            <p className="run-meta">
              {new Date(activeRun.date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
              {activeRun.notes && ` · ${activeRun.notes}`}
            </p>
          </div>

          <div className="attendance-summary card">
            <div className="summary-stat">
              <div className="summary-value">{attendees.length}</div>
              <div className="summary-label">Checked In</div>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <div className="summary-value">{members.length - attendees.length}</div>
              <div className="summary-label">Not Here</div>
            </div>
            <div className="summary-divider" />
            <div className="summary-stat">
              <div className="summary-value">{members.length}</div>
              <div className="summary-label">Total Members</div>
            </div>
          </div>

          <div className="qr-card card">
            <div className="qr-label">Members can scan to check themselves in</div>
            <QRCodeSVG
              value={`${checkInOrigin}/selfcheckin?run_id=${activeRun.id}`}
              size={160}
              fgColor="#57068c"
              level="M"
            />
            <div className="qr-url">{checkInOrigin}/selfcheckin</div>
          </div>

          <input
            className="search-input"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="member-list card">
            {filteredMembers.length === 0 ? (
              <p className="empty-state">No members found</p>
            ) : (
              filteredMembers.map((member) => {
                const checked = attendees.includes(member.id);
                return (
                  <div key={member.id} className={`member-item ${checked ? "checked" : ""}`}>
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email}</div>
                    </div>
                    <button
                      className={`checkin-btn ${checked ? "checked" : ""}`}
                      onClick={() => toggleAttendance(member.id)}
                    >
                      {checked ? "✓ Here" : "Check In"}
                    </button>
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
            Submit Session ({attendees.length} checked in)
          </button>
        </>
      )}
    </div>
  );
}
