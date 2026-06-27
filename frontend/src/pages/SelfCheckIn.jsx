import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getUsers } from "../api/users";
import { getRun } from "../api/runs";
import { checkIn, getAttendanceForRun } from "../api/attendance";
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
  const [checkedInMember, setCheckedInMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!runId) return;
    Promise.all([getUsers(), getAttendanceForRun(runId), getRun(runId)])
      .then(([users, records, run]) => {
        setMembers(users);
        setAttendees(new Set(records.map((r) => r.user_id)));
        setRunTitle(run.title || "Practice");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [runId]);

  async function handleTap(member) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!attendees.has(member.id)) {
        await checkIn(runId, member.id);
      }
      setCheckedInMember(member);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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

  if (checkedInMember) {
    return (
      <div className="sci sci-success-screen">
        <div className="sci-success-icon">✓</div>
        <h1 className="sci-success-title">You're checked in!</h1>
        <p className="sci-success-name">{checkedInMember.name}</p>
        <p className="sci-success-session">{runTitle}</p>
      </div>
    );
  }

  return (
    <div className="sci">
      <div className="sci-header">
        <h1 className="sci-title">NYU Run Club</h1>
        <p className="sci-subtitle">{runTitle}</p>
        <p className="sci-instructions">Find your name and tap to check in</p>
      </div>

      <input
        className="sci-search"
        placeholder="Search your name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div className="sci-list">
        {filtered.length === 0 ? (
          <p className="sci-empty">No members found</p>
        ) : (
          filtered.map((member) => (
            <button
              key={member.id}
              className="sci-member"
              onClick={() => handleTap(member)}
              disabled={submitting}
            >
              <div className="sci-avatar">{member.name[0].toUpperCase()}</div>
              <div className="sci-name">{member.name}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
