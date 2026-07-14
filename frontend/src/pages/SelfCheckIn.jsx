import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getUsers } from "../api/users";
import { getRun } from "../api/runs";
import { getRace, getResults, saveResult } from "../api/races";
import { checkIn, getAttendanceForRun } from "../api/attendance";
import "./SelfCheckIn.css";

export default function SelfCheckIn() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get("run_id");
  const raceId = searchParams.get("race_id");
  const mode = raceId ? "race" : "practice";

  const [members, setMembers] = useState([]);
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [checkedInMember, setCheckedInMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const storageKey = mode === "race" ? `sci_race_${raceId}` : `sci_${runId}`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setCheckedInMember(JSON.parse(stored));
      setLoading(false);
      return;
    }

    if (mode === "race") {
      Promise.all([getUsers(), getRace(raceId), getResults(raceId)])
        .then(([users, race, resultsList]) => {
          setMembers(users);
          setSessionTitle(race.title || "Race");
          setCheckedInIds(new Set(resultsList.map((r) => r.user_id)));
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      if (!runId) { setLoading(false); return; }
      Promise.all([getUsers(), getAttendanceForRun(runId), getRun(runId)])
        .then(([users, records, run]) => {
          setMembers(users);
          setSessionTitle(run.title || "Practice");
          setCheckedInIds(new Set(records.map((r) => r.user_id)));
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [runId, raceId]);

  async function handleTap(member) {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!checkedInIds.has(member.id)) {
        if (mode === "race") {
          await saveResult(raceId, { race_id: raceId, user_id: member.id, time_display: null });
        } else {
          await checkIn(runId, member.id);
        }
      }
      localStorage.setItem(storageKey, JSON.stringify(member));
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

  if (!runId && !raceId) {
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
        <p className="sci-success-session">{sessionTitle}</p>
      </div>
    );
  }

  return (
    <div className="sci">
      <div className="sci-header">
        <h1 className="sci-title">NYU Run Club</h1>
        <p className="sci-subtitle">{sessionTitle}</p>
        <p className="sci-instructions">
          {mode === "race" ? "Find your name to check in for this race" : "Find your name and tap to check in"}
        </p>
      </div>

      <div className="sci-search-wrapper">
        <p className="sci-search-hint">👇 Tap below to search</p>
        <input
          className="sci-search"
          placeholder="Start typing your name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
