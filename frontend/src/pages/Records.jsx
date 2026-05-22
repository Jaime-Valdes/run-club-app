import { useEffect, useState } from "react";
import { useClub } from "../context/ClubContext";
import { getUsers } from "../api/users";
import { getRuns } from "../api/runs";
import { getAttendanceForRun, getAttendanceCount, getAttendanceForUser } from "../api/attendance";
import "./Records.css";

function getStartOf(period) {
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - d.getDay());
  else if (period === "month") d.setDate(1);
  else if (period === "year") d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Records() {
  const { club } = useClub();
  const [members, setMembers] = useState([]);
  const [runs, setRuns] = useState([]);
  const [memberStats, setMemberStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("members");
  const [search, setSearch] = useState("");
  const [weekCheckIns, setWeekCheckIns] = useState(0);

  const [selectedRun, setSelectedRun] = useState(null);
  const [runAttendees, setRunAttendees] = useState([]);
  const [runLoading, setRunLoading] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");

  useEffect(() => {
    if (!club) return;
    Promise.all([getUsers(), getRuns(club.id)])
      .then(async ([users, runsData]) => {
        setMembers(users);
        setRuns(runsData);
        const counts = await Promise.all(
          users.map((u) => getAttendanceCount(u.id).then((r) => ({ id: u.id, count: r.total_attended })))
        );
        const statsMap = {};
        counts.forEach(({ id, count }) => { statsMap[id] = count; });
        setMemberStats(statsMap);

        const weekStart = getStartOf("week");
        const thisWeekRuns = runsData.filter((r) => new Date(r.date) >= weekStart);
        if (thisWeekRuns.length > 0) {
          const weekAttendance = await Promise.all(thisWeekRuns.map((r) => getAttendanceForRun(r.id)));
          setWeekCheckIns(weekAttendance.reduce((sum, a) => sum + a.length, 0));
        }
      })
      .finally(() => setLoading(false));
  }, [club]);

  async function handleSelectRun(run) {
    setSelectedRun(run);
    setRunLoading(true);
    const records = await getAttendanceForRun(run.id);
    const attendeeIds = new Set(records.map((r) => r.user_id));
    setRunAttendees(members.filter((m) => attendeeIds.has(m.id)));
    setRunLoading(false);
  }

  async function handleSelectMember(member) {
    setSelectedMember(member);
    setHistoryLoading(true);
    setHistoryFilter("all");
    const records = await getAttendanceForUser(member.id);
    setMemberHistory(records);
    setHistoryLoading(false);
  }

  const totalAttendances = Object.values(memberStats).reduce((a, b) => a + b, 0);

  const sortedMembers = [...members]
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (memberStats[b.id] || 0) - (memberStats[a.id] || 0));

  const filteredRuns = runs.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = memberHistory.filter((record) => {
    if (historyFilter === "all") return true;
    const date = new Date(record.runs?.date || record.checked_in_at);
    return date >= getStartOf(historyFilter);
  });

  const memberWeek = memberHistory.filter((r) => new Date(r.runs?.date || r.checked_in_at) >= getStartOf("week")).length;
  const memberMonth = memberHistory.filter((r) => new Date(r.runs?.date || r.checked_in_at) >= getStartOf("month")).length;
  const memberYear = memberHistory.filter((r) => new Date(r.runs?.date || r.checked_in_at) >= getStartOf("year")).length;

  if (!club || loading) return <div className="page-loading">Loading...</div>;

  if (selectedMember) {
    return (
      <div className="records">
        <button className="back-btn" onClick={() => setSelectedMember(null)}>← Back to Members</button>

        <div className="member-detail-header card">
          <div className="member-avatar member-avatar-lg">{selectedMember.name[0].toUpperCase()}</div>
          <div className="member-detail-info">
            <div className="member-detail-name">{selectedMember.name}</div>
            <div className="member-detail-email">{selectedMember.email}</div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{memberHistory.length}</div>
            <div className="stat-label">All Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{memberWeek}</div>
            <div className="stat-label">This Week</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{memberMonth}</div>
            <div className="stat-label">This Month</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{memberYear}</div>
            <div className="stat-label">This Year</div>
          </div>
        </div>

        <div className="view-tabs">
          {[
            { key: "all", label: "All Time" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
            { key: "year", label: "This Year" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`view-tab ${historyFilter === key ? "active" : ""}`}
              onClick={() => setHistoryFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {historyLoading ? (
          <p className="page-loading">Loading...</p>
        ) : (
          <div className="card">
            {filteredHistory.length === 0 ? (
              <p className="empty-state">No practices in this period</p>
            ) : (
              filteredHistory.map((record) => {
                const run = record.runs;
                return (
                  <div key={record.id} className="record-row">
                    <div className="record-info">
                      <div className="record-name">{run?.title || "Practice"}</div>
                      <div className="record-sub">
                        {run?.date && new Date(run.date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                        {run?.notes && ` · ${run.notes}`}
                      </div>
                    </div>
                    <div className="present-badge">✓ Attended</div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="records">
      <h1 className="page-title">Attendance Records</h1>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{members.length}</div>
          <div className="stat-label">Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{runs.length}</div>
          <div className="stat-label">Practices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{weekCheckIns}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalAttendances}</div>
          <div className="stat-label">Yearly Total</div>
        </div>
      </div>

      <div className="view-tabs">
        <button
          className={`view-tab ${view === "members" ? "active" : ""}`}
          onClick={() => { setView("members"); setSearch(""); }}
        >
          By Member
        </button>
        <button
          className={`view-tab ${view === "practices" ? "active" : ""}`}
          onClick={() => { setView("practices"); setSearch(""); setSelectedRun(null); }}
        >
          By Practice
        </button>
      </div>

      <input
        className="search-input"
        placeholder={view === "members" ? "Search members..." : "Search practices..."}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {view === "members" && (
        <div className="card">
          {sortedMembers.length === 0 ? (
            <p className="empty-state">No members found</p>
          ) : (
            sortedMembers.map((member, i) => {
              const count = memberStats[member.id] || 0;
              const rate = runs.length ? Math.round((count / runs.length) * 100) : 0;
              return (
                <div
                  key={member.id}
                  className="record-row record-row-clickable"
                  onClick={() => handleSelectMember(member)}
                >
                  <div className="rank">#{i + 1}</div>
                  <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                  <div className="record-info">
                    <div className="record-name">{member.name}</div>
                    <div className="record-sub">{member.email}</div>
                  </div>
                  <div className="record-stats">
                    <div className="record-count">{count} <span>runs</span></div>
                    <div className="record-bar">
                      <div className="record-bar-fill" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="record-rate">{rate}%</div>
                  </div>
                  <span className="chevron">›</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {view === "practices" && !selectedRun && (
        <div className="card">
          {filteredRuns.length === 0 ? (
            <p className="empty-state">No practices found</p>
          ) : (
            filteredRuns.map((run) => (
              <button
                key={run.id}
                className="run-item-btn"
                onClick={() => handleSelectRun(run)}
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
            ))
          )}
        </div>
      )}

      {view === "practices" && selectedRun && (
        <>
          <button className="back-btn" onClick={() => setSelectedRun(null)}>← All Practices</button>
          <div className="run-detail-header card">
            <h2>{selectedRun.title}</h2>
            <p className="run-meta">
              {new Date(selectedRun.date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
              {selectedRun.notes && ` · ${selectedRun.notes}`}
            </p>
            <div className="run-detail-stat">
              <strong>{runLoading ? "—" : runAttendees.length}</strong> / {members.length} members attended
            </div>
          </div>

          {runLoading ? (
            <p className="page-loading">Loading attendees...</p>
          ) : (
            <div className="card">
              {runAttendees.length === 0 ? (
                <p className="empty-state">No one checked in for this practice</p>
              ) : (
                runAttendees.map((member) => (
                  <div key={member.id} className="record-row">
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="record-info">
                      <div className="record-name">{member.name}</div>
                      <div className="record-sub">{member.email}</div>
                    </div>
                    <div className="present-badge">✓ Present</div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
