import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useClub } from "../context/ClubContext";
import { getUsers } from "../api/users";
import { getRuns, createRun, updateRun } from "../api/runs";
import { checkIn, checkOut, getAttendanceForRun, getAllAttendanceForClub } from "../api/attendance";
import { createUser } from "../api/users";
import { createRace } from "../api/races";
import { QRCodeSVG } from "qrcode.react";
import PageLoading from "../components/ui/PageLoading";
import EditRunModal from "../components/ui/EditRunModal";
import { checkInOrigin } from "../utils/network";
import { nowEastern } from "../utils/datetime";
import { deleteRunWithConfirm } from "../utils/runActions";
import "./Attendance.css";

const RACE_DISTANCES = ["5k", "10k", "Half Marathon", "XC", "Track Meet"];

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
    date: nowEastern(),
    notes: "",
  });

  const [newRace, setNewRace] = useState({
    title: "",
    date: nowEastern(),
    distance: "5k",
    xcDistance: "",
    location: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ firstName: "", lastName: "", netId: "" });
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  const [editingRun, setEditingRun] = useState(null);
  const [runAttendeeCounts, setRunAttendeeCounts] = useState({});

  useEffect(() => {
    if (!club) return;
    Promise.all([getRuns(club.id), getUsers(), getAllAttendanceForClub(club.id)])
      .then(([runsData, users, attendance]) => {
        setRuns(runsData);
        setMembers(users);
        const counts = {};
        attendance.forEach((rec) => {
          counts[rec.run_id] = (counts[rec.run_id] || 0) + 1;
        });
        setRunAttendeeCounts(counts);
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
      const run = await createRun({ ...newRun, club_id: club.id, is_live: true });
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
        is_live: true,
      });
      navigate(`/race/${race.id}`);
    } catch (err) {
      setCreateError(err.message || "Failed to create race. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRunSaved(updated) {
    setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setActiveRun((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  async function handleDeleteRun(run, e) {
    e.stopPropagation();
    if (await deleteRunWithConfirm(run)) {
      setRuns((prev) => prev.filter((r) => r.id !== run.id));
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

  async function handleAddMember(e) {
    e.preventDefault();
    setAddingMember(true);
    setAddMemberError("");
    try {
      const name = `${newMember.firstName.trim()} ${newMember.lastName.trim()}`;
      const email = `${newMember.netId.trim().toLowerCase()}@nyu.edu`;
      const user = await createUser({ name, email });
      await checkIn(activeRun.id, user.id);
      setMembers((prev) => [...prev, user]);
      setAttendees((prev) => [...prev, user.id]);
      setNewMember({ firstName: "", lastName: "", netId: "" });
      setShowAddMember(false);
    } catch (err) {
      setAddMemberError(err.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  }

  const filteredMembers = members
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const checkedInMembers = filteredMembers.filter((m) => attendees.includes(m.id));
  const notCheckedInMembers = filteredMembers.filter((m) => !attendees.includes(m.id));

  if (!club || loading) return <PageLoading />;

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
                      <div key={run.id} className="run-item-row">
                        <button
                          className="run-item-btn"
                          onClick={() => { setActiveRun(run); setStep("checkin"); }}
                        >
                          <div className="run-item-main">
                            <div className="run-title">{run.title}</div>
                            <div className="run-meta">
                              {new Date(run.date).toLocaleDateString("en-US", {
                                weekday: "short", month: "short", day: "numeric",
                              })}
                              {run.notes && ` · ${run.notes}`}
                            </div>
                          </div>
                          <span className="attendee-count">{runAttendeeCounts[run.id] || 0} attendees</span>
                          <span className="chevron">›</span>
                        </button>
                        <div className="row-actions">
                          <button className="row-icon-btn" onClick={() => setEditingRun(run)} title="Edit">✎</button>
                          <button className="row-icon-btn row-icon-danger" onClick={(e) => handleDeleteRun(run, e)} title="Delete">✕</button>
                        </div>
                      </div>
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
            <div className="checkin-title-row">
              <h1 className="page-title">{activeRun.title}</h1>
              {activeRun.is_live && <span className="checkin-live-badge">● LIVE</span>}
            </div>
            <p className="run-meta">
              {new Date(activeRun.date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
              {activeRun.notes && ` · ${activeRun.notes}`}
            </p>
          </div>

          <div className="attendance-summary">
            <div className="summary-stat">
              <div className="summary-value">{attendees.length}</div>
              <div className="summary-label">Checked In</div>
            </div>
            <div className="summary-divider" />
            <button
              className={`summary-submit-btn${!activeRun.is_live ? " submitted" : ""}`}
              disabled={!activeRun.is_live}
              onClick={async () => {
                await updateRun(activeRun.id, { is_live: false });
                setSubmitted(true);
                setTimeout(() => navigate("/"), 1500);
              }}
            >
              <div className="summary-submit-label">
                {activeRun.is_live ? "Submit Attendance" : "✓ Attendance Submitted"}
              </div>
            </button>
          </div>

          <div className="qr-card card">
            <div className="qr-label">Please scan to check in!</div>
            <QRCodeSVG
              value={`${checkInOrigin}/selfcheckin?run_id=${activeRun.id}`}
              size={160}
              fgColor="#57068c"
              level="M"
            />
          </div>

          <div className="search-add-row">
            <input
              className="search-input"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="add-member-btn" onClick={() => { setShowAddMember((v) => !v); setAddMemberError(""); }}>
              {showAddMember ? "✕ Cancel" : "+ New Member"}
            </button>
          </div>

          {showAddMember && (
            <form className="add-member-form card" onSubmit={handleAddMember}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    required
                    placeholder="Jane"
                    value={newMember.firstName}
                    onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    required
                    placeholder="Smith"
                    value={newMember.lastName}
                    onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Net ID</label>
                <input
                  required
                  placeholder="js1234"
                  value={newMember.netId}
                  onChange={(e) => setNewMember({ ...newMember, netId: e.target.value })}
                />
              </div>
              {addMemberError && <p className="form-error">{addMemberError}</p>}
              <button className="btn-primary" type="submit" disabled={addingMember}>
                {addingMember ? "Adding..." : "Add & Check In →"}
              </button>
            </form>
          )}

          <div className="member-list card">
            {filteredMembers.length === 0 ? (
              <p className="empty-state">No members found</p>
            ) : (
              <>
                {checkedInMembers.map((member) => (
                  <div key={member.id} className="member-item checked">
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email?.split("@")[0]}</div>
                    </div>
                    <button className="checkin-btn checked" onClick={() => toggleAttendance(member.id)}>
                      ✓ Here
                    </button>
                  </div>
                ))}
                {checkedInMembers.length > 0 && notCheckedInMembers.length > 0 && (
                  <div className="member-divider">Not yet checked in</div>
                )}
                {notCheckedInMembers.map((member) => (
                  <div key={member.id} className="member-item">
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-email">{member.email?.split("@")[0]}</div>
                    </div>
                    <button className="checkin-btn" onClick={() => toggleAttendance(member.id)}>
                      Check In
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

        </>
      )}

      {editingRun && (
        <EditRunModal run={editingRun} onClose={() => setEditingRun(null)} onSaved={handleRunSaved} />
      )}
    </div>
  );
}
