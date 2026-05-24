import { useEffect, useState } from "react";
import { useClub } from "../context/ClubContext";
import { getUsers } from "../api/users";
import { getRuns } from "../api/runs";
import { getAttendanceForRun, getAttendanceForUser, getAllAttendanceForClub } from "../api/attendance";
import { getUserResults, saveResult } from "../api/races";
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
  const [memberRaceResults, setMemberRaceResults] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingTimes, setPendingTimes] = useState({});
  const [savingTime, setSavingTime] = useState({});

  const [detailStart, setDetailStart] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [detailEnd, setDetailEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const [sortModes, setSortModes] = useState(["total"]);
  const [sortStart, setSortStart] = useState(() => {
    const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [sortEnd, setSortEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [allAttendance, setAllAttendance] = useState([]);
  const [rangeStats, setRangeStats] = useState({});

  useEffect(() => {
    if (!club) return;
    Promise.all([getUsers(), getRuns(club.id), getAllAttendanceForClub(club.id)])
      .then(([users, runsData, rawAttendance]) => {
        setMembers(users);
        setRuns(runsData);
        setAllAttendance(rawAttendance);

        const statsMap = {};
        rawAttendance.forEach((rec) => {
          statsMap[rec.user_id] = (statsMap[rec.user_id] || 0) + 1;
        });
        setMemberStats(statsMap);

        const weekStart = getStartOf("week");
        const weekRunIds = new Set(runsData.filter((r) => new Date(r.date) >= weekStart).map((r) => r.id));
        setWeekCheckIns(rawAttendance.filter((rec) => weekRunIds.has(rec.run_id)).length);
      })
      .finally(() => setLoading(false));
  }, [club]);

  useEffect(() => {
    if (!sortModes.includes("range") || !sortStart || !sortEnd || allAttendance.length === 0) return;
    const start = new Date(sortStart);
    const end = new Date(sortEnd + "T23:59:59");
    const rangeRunIds = new Set(
      runs.filter((r) => { const d = new Date(r.date); return d >= start && d <= end; }).map((r) => r.id)
    );
    const stats = {};
    allAttendance.filter((rec) => rangeRunIds.has(rec.run_id)).forEach((rec) => {
      stats[rec.user_id] = (stats[rec.user_id] || 0) + 1;
    });
    setRangeStats(stats);
  }, [sortModes, sortStart, sortEnd, runs, allAttendance]);

  function toggleSort(mode) {
    setSortModes((prev) => prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]);
  }

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
    setPendingTimes({});
    const [history, raceResults] = await Promise.all([
      getAttendanceForUser(member.id),
      getUserResults(member.id),
    ]);
    setMemberHistory(history);
    setMemberRaceResults(raceResults);
    setHistoryLoading(false);
  }

  async function handleSavePendingTime(raceResult) {
    const time = (pendingTimes[raceResult.id] || "").trim();
    if (!time) return;
    setSavingTime((s) => ({ ...s, [raceResult.id]: true }));
    try {
      const saved = await saveResult(raceResult.race_id, {
        race_id: raceResult.race_id,
        user_id: raceResult.user_id,
        time_display: time,
      });
      setMemberRaceResults((prev) =>
        prev.map((r) => (r.id === raceResult.id ? { ...r, time_display: saved.time_display } : r))
      );
      setPendingTimes((p) => { const n = { ...p }; delete n[raceResult.id]; return n; });
    } finally {
      setSavingTime((s) => ({ ...s, [raceResult.id]: false }));
    }
  }

  const totalAttendances = Object.values(memberStats).reduce((a, b) => a + b, 0);

  const sortedMembers = [...members]
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortModes.includes("range")) {
        const diff = (rangeStats[b.id] || 0) - (rangeStats[a.id] || 0);
        if (diff !== 0) return diff;
      }
      if (sortModes.includes("total")) {
        const diff = (memberStats[b.id] || 0) - (memberStats[a.id] || 0);
        if (diff !== 0) return diff;
      }
      if (sortModes.includes("last_name")) {
        const aLast = a.name.split(" ").slice(-1)[0].toLowerCase();
        const bLast = b.name.split(" ").slice(-1)[0].toLowerCase();
        return aLast.localeCompare(bLast);
      }
      return 0;
    });

  const filteredRuns = runs.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const combinedHistory = [
    ...memberHistory.map((r) => ({
      type: "practice",
      date: new Date(r.runs?.date || r.checked_in_at),
      title: r.runs?.title || "Practice",
      sub: r.runs?.notes,
      key: r.id,
    })),
    ...memberRaceResults.map((r) => ({
      type: "race",
      date: new Date(r.races?.date || r.created_at),
      title: r.races?.title || "Race",
      sub: r.races?.distance,
      time_display: r.time_display,
      raceResult: r,
      key: r.id,
    })),
  ].sort((a, b) => b.date - a.date);

  const filteredCombined = combinedHistory.filter((item) => {
    if (detailStart) { const s = new Date(detailStart); if (item.date < s) return false; }
    if (detailEnd) { const e = new Date(detailEnd + "T23:59:59"); if (item.date > e) return false; }
    return true;
  });

  const memberRangeCount = filteredCombined.filter((i) => i.type === "practice").length;

  if (!club || loading) return <div className="page-loading">Loading...</div>;

  if (selectedMember) {
    return (
      <div className="records">
        <button className="back-btn" onClick={() => setSelectedMember(null)}>← Back to Members</button>

        <div className="member-detail-header card">
          <div className="member-avatar-lg">{selectedMember.name[0].toUpperCase()}</div>
          <div className="member-detail-info">
            <div className="member-detail-name">{selectedMember.name}</div>
            <div className="member-detail-email">{selectedMember.email}</div>
          </div>
        </div>

        <div className="stats-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="stat-card">
            <div className="stat-value">{combinedHistory.filter(i => i.type === "practice").length}</div>
            <div className="stat-label">All Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{memberRangeCount}</div>
            <div className="stat-label">In Range</div>
          </div>
        </div>

        <div className="range-row">
          <input
            type="date"
            className="range-input"
            value={detailStart}
            onChange={(e) => setDetailStart(e.target.value)}
          />
          <span className="range-sep">–</span>
          <input
            type="date"
            className="range-input"
            value={detailEnd}
            onChange={(e) => setDetailEnd(e.target.value)}
          />
        </div>

        {historyLoading ? (
          <p className="page-loading">Loading...</p>
        ) : (
          <div className="card">
            {filteredCombined.length === 0 ? (
              <p className="empty-state">No sessions in this range</p>
            ) : (
              filteredCombined.map((item) => (
                <div key={item.key} className="record-row">
                  <div className={`session-type-dot ${item.type}`} />
                  <div className="record-info">
                    <div className="record-name">{item.title}</div>
                    <div className="record-sub">
                      {item.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      {item.sub && ` · ${item.sub}`}
                    </div>
                  </div>
                  {item.type === "practice" ? (
                    <div className="present-badge">✓ Attended</div>
                  ) : item.time_display ? (
                    <div className="time-result-badge">{item.time_display}</div>
                  ) : item.raceResult && item.raceResult.id in pendingTimes ? (
                    <div className="inline-time-entry">
                      <input
                        className="inline-time-input"
                        placeholder="18:42"
                        autoFocus
                        value={pendingTimes[item.raceResult.id]}
                        onChange={(e) => setPendingTimes((p) => ({ ...p, [item.raceResult.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSavePendingTime(item.raceResult);
                          if (e.key === "Escape") setPendingTimes((p) => { const n = { ...p }; delete n[item.raceResult.id]; return n; });
                        }}
                      />
                      <button
                        className="inline-time-save"
                        onClick={() => handleSavePendingTime(item.raceResult)}
                        disabled={savingTime[item.raceResult.id]}
                      >
                        {savingTime[item.raceResult.id] ? "…" : "Save"}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="pending-badge"
                      onClick={() => setPendingTimes((p) => ({ ...p, [item.raceResult.id]: "" }))}
                    >
                      ⏱ Enter Time
                    </button>
                  )}
                </div>
              ))
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
        <button className={`view-tab ${view === "members" ? "active" : ""}`} onClick={() => { setView("members"); setSearch(""); }}>
          By Member
        </button>
        <button className={`view-tab ${view === "practices" ? "active" : ""}`} onClick={() => { setView("practices"); setSearch(""); setSelectedRun(null); }}>
          By Practice
        </button>
      </div>

      {view === "members" && (
        <>
          <div className="sort-row">
            <span className="sort-label">Sort:</span>
            <button className={`sort-pill ${sortModes.includes("total") ? "active" : ""}`} onClick={() => toggleSort("total")}>
              Total
            </button>
            <button className={`sort-pill ${sortModes.includes("last_name") ? "active" : ""}`} onClick={() => toggleSort("last_name")}>
              Last Name
            </button>
            <button className={`sort-pill ${sortModes.includes("range") ? "active" : ""}`} onClick={() => toggleSort("range")}>
              Date Range
            </button>
          </div>

          {sortModes.includes("range") && (
            <div className="range-row">
              <input
                type="date"
                className="range-input"
                value={sortStart}
                onChange={(e) => setSortStart(e.target.value)}
              />
              <span className="range-sep">–</span>
              <input
                type="date"
                className="range-input"
                value={sortEnd}
                onChange={(e) => setSortEnd(e.target.value)}
              />
            </div>
          )}

          <input
            className="search-input"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="card">
            {sortedMembers.length === 0 ? (
              <p className="empty-state">No members found</p>
            ) : (
              sortedMembers.map((member, i) => {
                const count = memberStats[member.id] || 0;
                const displayCount = sortModes.includes("range") ? (rangeStats[member.id] || 0) : count;
                const rate = runs.length ? Math.round((count / runs.length) * 100) : 0;
                return (
                  <div key={member.id} className="record-row record-row-clickable" onClick={() => handleSelectMember(member)}>
                    <div className="rank">#{i + 1}</div>
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="record-info">
                      <div className="record-name">{member.name}</div>
                      <div className="record-sub">{member.email}</div>
                    </div>
                    <div className="record-stats">
                      <div className="record-count">{displayCount} <span>runs</span></div>
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
        </>
      )}

      {view === "practices" && (
        <>
          <input
            className="search-input"
            placeholder="Search practices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {!selectedRun ? (
            <div className="card">
              {filteredRuns.length === 0 ? (
                <p className="empty-state">No practices found</p>
              ) : (
                filteredRuns.map((run) => (
                  <button key={run.id} className="run-item-btn" onClick={() => handleSelectRun(run)}>
                    <div>
                      <div className="run-title">{run.title}</div>
                      <div className="run-meta">
                        {new Date(run.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        {run.notes && ` · ${run.notes}`}
                      </div>
                    </div>
                    <span className="chevron">›</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <button className="back-btn" onClick={() => setSelectedRun(null)}>← All Practices</button>
              <div className="run-detail-header card">
                <h2>{selectedRun.title}</h2>
                <p className="run-meta">
                  {new Date(selectedRun.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
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
        </>
      )}
    </div>
  );
}
