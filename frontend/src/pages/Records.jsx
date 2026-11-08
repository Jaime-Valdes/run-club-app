import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useClub } from "../context/ClubContext";
import { getUsers } from "../api/users";
import { getRuns } from "../api/runs";
import { getAttendanceForRun, getAttendanceForUser, getAllAttendanceForClub } from "../api/attendance";
import { getRaces, getUserResults, saveResult, getAllResultsForClub } from "../api/races";
import PageLoading from "../components/ui/PageLoading";
import EditRunModal from "../components/ui/EditRunModal";
import EditMemberModal from "../components/ui/EditMemberModal";
import { formatTimeInput, pluralize } from "../utils/format";
import { nowEastern } from "../utils/datetime";
import { toggleSortMode } from "../utils/sort";
import { deleteRunWithConfirm } from "../utils/runActions";
import { deleteUserWithConfirm } from "../utils/memberActions";
import "./Records.css";

// A check-in is either an attendance row (practice) or a race_results row (race).
const sessionIdOf = (checkIn) => checkIn.run_id ?? checkIn.race_id;

// Counts check-ins at sessions dated within [from, to). Omit a bound to leave it open.
function tallyCheckIns(checkIns, sessions, from, to) {
  const sessionIds = new Set(
    sessions
      .filter((s) => {
        const d = new Date(s.date);
        return (!from || d >= from) && (!to || d < to);
      })
      .map((s) => s.id)
  );
  const perMember = {};
  let total = 0;
  checkIns.forEach((rec) => {
    if (!sessionIds.has(sessionIdOf(rec))) return;
    perMember[rec.user_id] = (perMember[rec.user_id] || 0) + 1;
    total += 1;
  });
  return { perMember, total };
}

const todayInput = () => nowEastern().slice(0, 10);
const yearStartInput = () => `${todayInput().slice(0, 4)}-01-01`;
const startOfDay = (input) => new Date(`${input}T00:00:00`);
const endOfDay = (input) => new Date(`${input}T23:59:59.999`);

// Sep 1 through May 15. Over the summer this stays on the year that just ended.
function academicYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return { start: new Date(startYear, 8, 1), end: new Date(startYear + 1, 4, 16) };
}

function getStartOf(period) {
  const d = new Date();
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else if (period === "month") d.setDate(1);
  else if (period === "year") d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketStart(date, period) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else d.setDate(1);
  return d;
}

function nextBucket(date, period) {
  const d = new Date(date);
  if (period === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function bucketLabel(date, period) {
  return period === "week"
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function AttendanceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{d.tooltipLabel}</div>
      <div className="chart-tooltip-time">
        {d.count} {pluralize(d.count, "run")}
      </div>
      <div className="chart-tooltip-breakdown">
        {d.practices} {pluralize(d.practices, "practice")} · {d.races} {pluralize(d.races, "race")}
      </div>
    </div>
  );
}

function AttendanceChart({ sessions, rangeStart, rangeEnd, period, onPeriodChange }) {
  const times = sessions.map((s) => s.date.getTime());
  const start = rangeStart || (times.length ? new Date(Math.min(...times)) : null);
  const end = rangeEnd || (times.length ? new Date(Math.max(...times)) : null);

  const buckets = new Map();
  if (start && end && start <= end) {
    for (let b = bucketStart(start, period); b <= end; b = nextBucket(b, period)) {
      buckets.set(b.getTime(), { practices: 0, races: 0 });
    }
  }
  sessions.forEach(({ date, type }) => {
    const key = bucketStart(date, period).getTime();
    const bucket = buckets.get(key) || { practices: 0, races: 0 };
    bucket[type === "race" ? "races" : "practices"] += 1;
    buckets.set(key, bucket);
  });

  const data = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, { practices, races }]) => {
      const date = new Date(time);
      const label = bucketLabel(date, period);
      return {
        label,
        count: practices + races,
        practices,
        races,
        tooltipLabel: period === "week" ? `Week of ${label}` : date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    });

  return (
    <div className="pr-chart-card card attendance-chart-card">
      <div className="attendance-chart-header">
        <div className="pr-chart-title">Runs · By {period === "week" ? "Week" : "Month"}</div>
        <div className="attendance-chart-toggle">
          <button className={`sort-pill ${period === "week" ? "active" : ""}`} onClick={() => onPeriodChange("week")}>
            Week
          </button>
          <button className={`sort-pill ${period === "month" ? "active" : ""}`} onClick={() => onPeriodChange("month")}>
            Month
          </button>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="empty-state">No runs in this range</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
            <Tooltip content={<AttendanceTooltip />} cursor={{ fill: "var(--primary-glow)" }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Records() {
  const { club } = useClub();
  const [members, setMembers] = useState([]);
  const [runs, setRuns] = useState([]);
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("members");
  const [search, setSearch] = useState("");

  const [selectedRun, setSelectedRun] = useState(null);
  const [runAttendees, setRunAttendees] = useState([]);
  const [runLoading, setRunLoading] = useState(false);
  const [sortAttendeesByLastName, setSortAttendeesByLastName] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  const [selectedMember, setSelectedMember] = useState(null);
  const [memberHistory, setMemberHistory] = useState([]);
  const [memberRaceResults, setMemberRaceResults] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingTimes, setPendingTimes] = useState({});
  const [savingTime, setSavingTime] = useState({});

  const [detailStart, setDetailStart] = useState(yearStartInput);
  const [detailEnd, setDetailEnd] = useState(todayInput);
  const [chartPeriod, setChartPeriod] = useState("month");

  const [sortModes, setSortModes] = useState(["total"]);
  const [sortStart, setSortStart] = useState(yearStartInput);
  const [sortEnd, setSortEnd] = useState(todayInput);
  const [allAttendance, setAllAttendance] = useState([]);
  const [allRaceResults, setAllRaceResults] = useState([]);

  useEffect(() => {
    if (!club) return;
    Promise.all([getUsers(), getRuns(club.id), getAllAttendanceForClub(club.id), getRaces(club.id), getAllResultsForClub(club.id)])
      .then(([users, runsData, rawAttendance, racesData, raceResults]) => {
        setMembers(users);
        setRuns(runsData);
        setRaces(racesData);
        setAllAttendance(rawAttendance);
        setAllRaceResults(raceResults);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [club]);

  const [exporting, setExporting] = useState(false);

  function exportPractice() {
    const rows = runAttendees.map((member) => {
      const parts = member.name.trim().split(" ");
      return {
        "First Name": parts[0],
        "Last Name": parts.slice(1).join(" "),
        "Email": member.email || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendees");
    const safeName = (selectedRun?.title || "practice").replace(/[^a-z0-9]/gi, "-").toLowerCase();
    XLSX.writeFile(wb, `${safeName}-attendees.xlsx`);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const allResults = await getAllResultsForClub(club.id);
      const racesPerUser = {};
      allResults.forEach((r) => {
        racesPerUser[r.user_id] = (racesPerUser[r.user_id] || 0) + 1;
      });
      const practicesPerUser = {};
      allAttendance.forEach((r) => {
        practicesPerUser[r.user_id] = (practicesPerUser[r.user_id] || 0) + 1;
      });

      const rows = sortedMembers.map((member) => {
        const nameParts = member.name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ");
        const practices = practicesPerUser[member.id] || 0;
        const races = racesPerUser[member.id] || 0;
        return {
          "First Name": firstName,
          "Last Name": lastName,
          "Practices Attended": practices,
          "Races Attended": races,
          "Total Attendances": practices + races,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `${club.name || "run-club"}-attendance.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  function handleRunSaved(updated) {
    setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleDeleteRun(run, e) {
    e.stopPropagation();
    if (await deleteRunWithConfirm(run)) {
      setRuns((prev) => prev.filter((r) => r.id !== run.id));
      setAllAttendance((prev) => prev.filter((rec) => rec.run_id !== run.id));
    }
  }

  function handleMemberSaved(updated) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  async function handleDeleteMember(member, e) {
    e.stopPropagation();
    if (await deleteUserWithConfirm(member)) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      setAllAttendance((prev) => prev.filter((rec) => rec.user_id !== member.id));
      setAllRaceResults((prev) => prev.filter((rec) => rec.user_id !== member.id));
    }
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

  const checkIns = [...allAttendance, ...allRaceResults];
  const sessions = [...runs, ...races];
  const memberStats = tallyCheckIns(checkIns, sessions).perMember;
  const weekStart = getStartOf("week");
  const weekCheckIns = tallyCheckIns(checkIns, sessions, weekStart, nextBucket(weekStart, "week")).total;
  const year = academicYear();
  const yearCheckIns = tallyCheckIns(checkIns, sessions, year.start, year.end).total;
  const rangeStats = tallyCheckIns(
    checkIns,
    sessions,
    sortStart ? startOfDay(sortStart) : null,
    sortEnd ? endOfDay(sortEnd) : null
  ).perMember;

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

  const runAttendeeCounts = {};
  allAttendance.forEach((rec) => {
    runAttendeeCounts[rec.run_id] = (runAttendeeCounts[rec.run_id] || 0) + 1;
  });

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
    if (detailStart && item.date < startOfDay(detailStart)) return false;
    if (detailEnd && item.date > endOfDay(detailEnd)) return false;
    return true;
  });

  if (!club || loading) return <PageLoading />;

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
            <div className="stat-value">{combinedHistory.length}</div>
            <div className="stat-label">All Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredCombined.length}</div>
            <div className="stat-label">In Range</div>
          </div>
        </div>

        {!historyLoading && (
          <AttendanceChart
            sessions={filteredCombined}
            rangeStart={detailStart ? new Date(detailStart + "T00:00:00") : null}
            rangeEnd={detailEnd ? new Date(detailEnd + "T23:59:59") : null}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        )}

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
                  ) : item.raceResult && item.raceResult.id in pendingTimes ? (
                    <div className="inline-time-entry">
                      <input
                        className="inline-time-input"
                        placeholder="16:54"
                        autoFocus
                        value={pendingTimes[item.raceResult.id]}
                        onChange={(e) => setPendingTimes((p) => ({ ...p, [item.raceResult.id]: formatTimeInput(e.target.value) }))}
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
                      <button
                        className="inline-time-cancel"
                        onClick={() => setPendingTimes((p) => { const n = { ...p }; delete n[item.raceResult.id]; return n; })}
                      >✕</button>
                    </div>
                  ) : item.time_display ? (
                    <div className="inline-time-saved">
                      <span className="time-result-badge">{item.time_display}</span>
                      <button
                        className="time-edit-sm"
                        onClick={() => setPendingTimes((p) => ({ ...p, [item.raceResult.id]: item.time_display }))}
                      >Edit</button>
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
          <div className="stat-label">Attendances This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{yearCheckIns}</div>
          <div className="stat-label">Yearly Attendance Total</div>
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
            <span className="sort-label">Sort By:</span>
            <button className={`sort-pill ${sortModes.includes("total") ? "active" : ""}`} onClick={() => toggleSortMode(setSortModes, "total")}>
              Total attendances
            </button>
            <button className={`sort-pill ${sortModes.includes("last_name") ? "active" : ""}`} onClick={() => toggleSortMode(setSortModes, "last_name")}>
              Last Name
            </button>
            <button className={`sort-pill ${sortModes.includes("range") ? "active" : ""}`} onClick={() => toggleSortMode(setSortModes, "range")}>
              Date Range
            </button>
            <button className="export-btn" onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "⬇ Export to spreadsheet"}
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
                return (
                  <div key={member.id} className="record-row record-row-clickable" onClick={() => handleSelectMember(member)}>
                    <div className="rank">#{i + 1}</div>
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="record-info">
                      <div className="record-name">{member.name}</div>
                      <div className="record-sub">{member.email}</div>
                    </div>
                    <div className="record-stats">
                      <div className="record-count">{displayCount} <span>{pluralize(displayCount, "run")}</span></div>
                    </div>
                    <span className="chevron">›</span>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="row-icon-btn" onClick={() => setEditingMember(member)} title="Edit">✎</button>
                      <button className="row-icon-btn row-icon-danger" onClick={(e) => handleDeleteMember(member, e)} title="Delete">✕</button>
                    </div>
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
                  <div key={run.id} className="run-item-row">
                    <button className="run-item-btn" onClick={() => handleSelectRun(run)}>
                      <div className="run-item-main">
                        <div className="run-title">{run.title}</div>
                        <div className="run-meta">
                          {new Date(run.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {run.notes && ` · ${run.notes}`}
                        </div>
                      </div>
                      <span className="attendee-count">{runAttendeeCounts[run.id] || 0} <span>{pluralize(runAttendeeCounts[run.id] || 0, "attendee")}</span></span>
                      <span className="chevron">›</span>
                    </button>
                    <div className="row-actions">
                      <button className="row-icon-btn" onClick={() => setEditingRun(run)} title="Edit">✎</button>
                      <button className="row-icon-btn row-icon-danger" onClick={(e) => handleDeleteRun(run, e)} title="Delete">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="context-actions">
                <button className="back-btn" onClick={() => setSelectedRun(null)}>← All Practices</button>
                {!runLoading && runAttendees.length > 0 && (
                  <button className="export-btn" onClick={exportPractice}>⬇ Export attendees</button>
                )}
              </div>
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
              {!runLoading && runAttendees.length > 0 && (
                <div className="sort-row">
                  <span className="sort-label">Sort By:</span>
                  <button
                    className={`sort-pill ${sortAttendeesByLastName ? "active" : ""}`}
                    onClick={() => setSortAttendeesByLastName((v) => !v)}
                  >
                    Last Name
                  </button>
                </div>
              )}
              {runLoading ? (
                <p className="page-loading">Loading attendees...</p>
              ) : (
                <div className="card">
                  {runAttendees.length === 0 ? (
                    <p className="empty-state">No one checked in for this practice</p>
                  ) : (
                    [...runAttendees]
                      .sort((a, b) => {
                        if (!sortAttendeesByLastName) return 0;
                        const aLast = a.name.split(" ").slice(-1)[0].toLowerCase();
                        const bLast = b.name.split(" ").slice(-1)[0].toLowerCase();
                        return aLast.localeCompare(bLast);
                      })
                      .map((member) => (
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

      {editingRun && (
        <EditRunModal run={editingRun} onClose={() => setEditingRun(null)} onSaved={handleRunSaved} />
      )}
      {editingMember && (
        <EditMemberModal member={editingMember} onClose={() => setEditingMember(null)} onSaved={handleMemberSaved} />
      )}
    </div>
  );
}
