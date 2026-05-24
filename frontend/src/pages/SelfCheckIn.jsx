import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getUsers } from "../api/users";
import { checkIn, checkOut, getAttendanceForRun } from "../api/attendance";
import "./SelfCheckIn.css";

export default function SelfCheckIn() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("run_id");

  const [members, setMembers] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runTitle, setRunTitle] = useState("");
  const [justCheckedIn, setJustCheckedIn] = useState(null);

  useEffect(() => {
    if (!runId) return;
    Promise.all([
      getUsers(),
      getAttendanceForRun(runId),
      fetch(`/runs/${runId}`).then((r) => r.json()),
    ])
      .then(([users, records, run]) => {
        setMembers(users);
        setAttendees(records.map((r) => r.user_id));
        setRunTitle(run.title || "Practice");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  async function handleTap(member) {
    const isCheckedIn = attendees.includes(member.id);
    if (isCheckedIn) {
      await checkOut(runId, member.id);
      setAttendees((prev) => prev.filter((id) => id !== member.id));
      setJustCheckedIn(null);
    } else {
      await checkIn(runId, member.id);
      setAttendees((prev) => [...prev, member.id]);
      setJustCheckedIn(member.id);
    }
  }

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!runId) {
    return (
      <div className="sci-error">
        <div className="sci-error-icon">🔗</div>
        <p>Invalid check-in link.</p>
      </div>
    );
  }

  if (loading) return <div className="sci-loading">Loading...</div>;
  if (error) return <div className="sci-error"><div className="sci-error-icon">⚠️</div><p>{error}</p></div>;

  return (
    <div className="sci">
      <div className="sci-header">
        <div className="sci-logo">🏃</div>
        <h1 className="sci-title">NYU Run Club</h1>
        <p className="sci-subtitle">{runTitle}</p>
        <p className="sci-instructions">Find your name and tap to check in</p>
      </div>

      {justCheckedIn && (
        <div className="sci-success-banner">
          ✓ {members.find((m) => m.id === justCheckedIn)?.name} — checked in!
        </div>
      )}

      <input
        className="sci-search"
        placeholder="Search your name..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setJustCheckedIn(null); }}
        autoFocus
      />

      <div className="sci-list">
        {filtered.length === 0 ? (
          <p className="sci-empty">No members found</p>
        ) : (
          filtered.map((member) => {
            const checked = attendees.includes(member.id);
            return (
              <button
                key={member.id}
                className={`sci-member ${checked ? "checked" : ""}`}
                onClick={() => handleTap(member)}
              >
                <div className="sci-avatar">{member.name[0].toUpperCase()}</div>
                <div className="sci-name">{member.name}</div>
                {checked && <span className="sci-check">✓</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
