import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useClub } from "../context/ClubContext";
import { getUsers, updateUser } from "../api/users";
import {
  getRaces, getResults, getUserResults, saveResult,
  getTrackResults, getUserTrackResults, saveTrackResult, deleteTrackResult,
} from "../api/races";
import "./Records.css";

function parseSeconds(t) {
  if (!t) return Infinity;
  const p = t.split(":").map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0);
}

function formatTime(secs) {
  if (!isFinite(secs)) return "";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const DISTANCE_ORDER = ["5k", "10k", "Half Marathon", "Marathon", "XC 8k", "XC 6k"];
const FIELD_EVENTS = new Set(["Long Jump"]);
const TRACK_EVENT_ORDER = [
  "60m", "100m", "200m", "400m", "800m", "1500m", "1600m", "3000m", "3200m", "5000m", "10000m",
  "4x100m Relay", "4x200m Relay", "4x400m Relay", "4xMile Relay", "SMR", "DMR",
  "Long Jump",
];

function resolveXC(dist, gender) {
  if (dist === "XC") return gender === "woman" ? "XC 6k" : "XC 8k";
  return dist;
}

function isBetterTrackResult(event, newVal, oldVal) {
  if (FIELD_EVENTS.has(event)) return parseFloat(newVal) > (parseFloat(oldVal) || -Infinity);
  return parseSeconds(newVal) < parseSeconds(oldVal);
}

function RoadChart({ results, distance, gender }) {
  const data = results
    .filter((r) => resolveXC(r.races?.distance, gender) === distance && r.time_display)
    .map((r) => ({
      date: new Date(r.races?.date || r.created_at),
      secs: parseSeconds(r.time_display),
      label: r.time_display,
      race: r.races?.title || "Race",
    }))
    .sort((a, b) => a.date - b.date)
    .map((r) => ({
      ...r,
      dateStr: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
    }));

  if (data.length === 0) return <p className="empty-state">No timed results for {distance}</p>;

  const prSecs = Math.min(...data.map((d) => d.secs));
  const maxSecs = Math.max(...data.map((d) => d.secs));
  const padding = Math.max((maxSecs - prSecs) * 0.15, 30);
  const yMin = Math.max(0, prSecs - padding);
  const yMax = maxSecs + padding;

  const CustomDot = ({ cx, cy, payload }) => {
    const isPR = payload.secs === prSecs;
    return <circle cx={cx} cy={cy} r={isPR ? 7 : 4} fill={isPR ? "var(--success)" : "var(--primary)"} stroke="#fff" strokeWidth={isPR ? 2.5 : 1.5} />;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const isPR = d.secs === prSecs;
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-race">{d.race}</div>
        <div className="chart-tooltip-date">{d.dateStr}</div>
        <div className={`chart-tooltip-time${isPR ? " pr" : ""}`}>{d.label}{isPR ? " 🏆 PR" : ""}</div>
      </div>
    );
  };

  return (
    <div className="pr-chart-card card">
      <div className="pr-chart-title">{distance} · Race History</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis domain={[yMin, yMax]} reversed tickFormatter={formatTime} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={CustomTooltip} />
          <ReferenceLine y={prSecs} stroke="var(--success)" strokeDasharray="4 3" strokeWidth={1.5} />
          <Line type="monotone" dataKey="secs" stroke="var(--primary)" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 7, fill: "var(--primary)", stroke: "#fff", strokeWidth: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="pr-chart-legend">
        <span className="pr-chart-legend-pr">● PR</span>
        <span className="pr-chart-legend-other">● Other result</span>
      </div>
    </div>
  );
}

function TrackChart({ trackResults, event }) {
  const data = trackResults
    .filter((r) => r.event === event && r.result_display)
    .map((r) => ({
      date: new Date(r.races?.date || r.created_at),
      secs: parseSeconds(r.result_display),
      label: r.result_display,
      race: r.races?.title || "Meet",
    }))
    .sort((a, b) => a.date - b.date)
    .map((r) => ({
      ...r,
      dateStr: r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
    }));

  if (data.length < 2) return null;

  const prSecs = Math.min(...data.map((d) => d.secs));
  const maxSecs = Math.max(...data.map((d) => d.secs));
  const padding = Math.max((maxSecs - prSecs) * 0.15, 5);
  const yMin = Math.max(0, prSecs - padding);
  const yMax = maxSecs + padding;

  const CustomDot = ({ cx, cy, payload }) => {
    const isPR = payload.secs === prSecs;
    return <circle cx={cx} cy={cy} r={isPR ? 7 : 4} fill={isPR ? "var(--success)" : "var(--primary)"} stroke="#fff" strokeWidth={isPR ? 2.5 : 1.5} />;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const isPR = d.secs === prSecs;
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-race">{d.race}</div>
        <div className="chart-tooltip-date">{d.dateStr}</div>
        <div className={`chart-tooltip-time${isPR ? " pr" : ""}`}>{d.label}{isPR ? " 🏆 PR" : ""}</div>
      </div>
    );
  };

  return (
    <div className="pr-chart-card card">
      <div className="pr-chart-title">{event} · Progress</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="dateStr" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis domain={[yMin, yMax]} reversed tickFormatter={formatTime} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={CustomTooltip} />
          <ReferenceLine y={prSecs} stroke="var(--success)" strokeDasharray="4 3" strokeWidth={1.5} />
          <Line type="monotone" dataKey="secs" stroke="var(--primary)" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 7, fill: "var(--primary)", stroke: "#fff", strokeWidth: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="pr-chart-legend">
        <span className="pr-chart-legend-pr">● PR</span>
        <span className="pr-chart-legend-other">● Other result</span>
      </div>
    </div>
  );
}

function TrackEventsList({ events, onAdd, onEdit, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ event: "", result: "" });
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState({});

  async function handleAdd() {
    if (!newEvent.event.trim()) return;
    setSaving(true);
    await onAdd(newEvent.event.trim(), newEvent.result.trim() || null);
    setSaving(false);
    setAdding(false);
    setNewEvent({ event: "", result: "" });
  }

  async function handleEditSave(eventName, value) {
    await onEdit(eventName, value.trim() || null);
    setEditingEvent((p) => { const n = { ...p }; delete n[eventName]; return n; });
  }

  return (
    <div className="track-events">
      {events.map((ev) => (
        <div key={ev.id} className="track-event-row">
          <span className="track-event-name">{ev.event}</span>
          {editingEvent[ev.event] !== undefined ? (
            <>
              <input
                className="inline-time-input track-event-result-input"
                value={editingEvent[ev.event]}
                autoFocus
                onChange={(e) => setEditingEvent((p) => ({ ...p, [ev.event]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave(ev.event, editingEvent[ev.event]);
                  if (e.key === "Escape") setEditingEvent((p) => { const n = { ...p }; delete n[ev.event]; return n; });
                }}
              />
              <button className="inline-time-save" onClick={() => handleEditSave(ev.event, editingEvent[ev.event])}>Save</button>
            </>
          ) : (
            <span
              className={`track-event-result${ev.result_display ? "" : " no-result"}`}
              onClick={() => setEditingEvent((p) => ({ ...p, [ev.event]: ev.result_display || "" }))}
              title="Click to edit"
            >
              {ev.result_display || "—"}
            </span>
          )}
          <button className="track-event-delete" onClick={() => onDelete(ev.event)}>×</button>
        </div>
      ))}

      {adding ? (
        <div className="track-event-add-row">
          <input
            list="track-events-datalist"
            className="inline-time-input track-event-name-input"
            placeholder="Event"
            value={newEvent.event}
            autoFocus
            onChange={(e) => setNewEvent((n) => ({ ...n, event: e.target.value }))}
          />
          <datalist id="track-events-datalist">
            {TRACK_EVENT_ORDER.map((e) => <option key={e} value={e} />)}
          </datalist>
          <input
            className="inline-time-input track-event-result-input"
            placeholder="Result"
            value={newEvent.result}
            onChange={(e) => setNewEvent((n) => ({ ...n, result: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewEvent({ event: "", result: "" }); } }}
          />
          <button className="inline-time-save" onClick={handleAdd} disabled={saving || !newEvent.event.trim()}>
            {saving ? "…" : "Add"}
          </button>
          <button className="track-cancel-btn" onClick={() => { setAdding(false); setNewEvent({ event: "", result: "" }); }}>✕</button>
        </div>
      ) : (
        <button className="track-add-btn" onClick={() => setAdding(true)}>+ Add Event</button>
      )}
    </div>
  );
}

function RecordCell({ rec, timeKey }) {
  return (
    <div className="cr-record-cell">
      <div className="cr-record-time">{rec[timeKey]}</div>
      <div className="cr-record-holder">{rec.memberName}</div>
      <div className="cr-record-race">
        {rec.races?.title}
        {rec.races?.date && ` · ${new Date(rec.races.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
      </div>
    </div>
  );
}

export default function RaceRecords() {
  const { club } = useClub();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [races, setRaces] = useState([]);
  const [memberRaceCounts, setMemberRaceCounts] = useState({});
  const [memberPendingCounts, setMemberPendingCounts] = useState({});
  const [sortModes, setSortModes] = useState(["total"]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("members");
  const [search, setSearch] = useState("");

  const [selectedMember, setSelectedMember] = useState(null);
  const [memberResults, setMemberResults] = useState([]);
  const [memberTrackResults, setMemberTrackResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [detailView, setDetailView] = useState("history");
  const [pendingTimes, setPendingTimes] = useState({});
  const [savingTime, setSavingTime] = useState({});
  const [selectedPRDist, setSelectedPRDist] = useState(null);
  const [selectedTrackPREvent, setSelectedTrackPREvent] = useState(null);
  const [allResultsFlat, setAllResultsFlat] = useState([]);
  const [allTrackFlat, setAllTrackFlat] = useState([]);

  useEffect(() => {
    if (!club) return;
    Promise.all([getUsers(), getRaces(club.id)])
      .then(async ([users, racesData]) => {
        setMembers(users);
        setRaces(racesData);
        if (racesData.length === 0) return;

        const trackMeets = racesData.filter((r) => r.race_type === "track");

        const [allResults, ...allTrackResultsArr] = await Promise.all([
          Promise.all(racesData.map((r) => getResults(r.id))),
          ...trackMeets.map((r) => getTrackResults(r.id)),
        ]);

        // trackResultsByRaceUser[race_id][user_id] = # results with result_display
        const trackResultsByRaceUser = {};
        trackMeets.forEach((race, i) => {
          trackResultsByRaceUser[race.id] = {};
          allTrackResultsArr[i].forEach((tr) => {
            if (!trackResultsByRaceUser[race.id][tr.user_id]) trackResultsByRaceUser[race.id][tr.user_id] = 0;
            if (tr.result_display) trackResultsByRaceUser[race.id][tr.user_id]++;
          });
        });

        const counts = {};
        const pending = {};
        allResults.forEach((results, raceIdx) => {
          const race = racesData[raceIdx];
          results.forEach((res) => {
            counts[res.user_id] = (counts[res.user_id] || 0) + 1;
            if (race.race_type === "track") {
              const hasResult = (trackResultsByRaceUser[race.id]?.[res.user_id] || 0) > 0;
              if (!hasResult) pending[res.user_id] = (pending[res.user_id] || 0) + 1;
            } else {
              if (!res.time_display) pending[res.user_id] = (pending[res.user_id] || 0) + 1;
            }
          });
        });
        setMemberRaceCounts(counts);
        setMemberPendingCounts(pending);

        const flat = [];
        allResults.forEach((results, raceIdx) => {
          const race = racesData[raceIdx];
          if (race.race_type !== "track") results.forEach((res) => flat.push({ ...res, races: race }));
        });
        setAllResultsFlat(flat);

        const trackFlat = [];
        trackMeets.forEach((race, i) => allTrackResultsArr[i].forEach((tr) => trackFlat.push({ ...tr, races: race })));
        setAllTrackFlat(trackFlat);
      })
      .finally(() => setLoading(false));
  }, [club]);

  function toggleSort(mode) {
    setSortModes((prev) => prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]);
  }

  async function handleSelectMember(member) {
    setSelectedMember(member);
    setResultsLoading(true);
    setDetailView("history");
    setPendingTimes({});
    setSelectedPRDist(null);
    setSelectedTrackPREvent(null);
    const [results, trackResRaw] = await Promise.all([
      getUserResults(member.id),
      getUserTrackResults(member.id),
    ]);
    setMemberResults(results);
    setMemberTrackResults(trackResRaw);
    setResultsLoading(false);
  }

  async function handleSaveTime(result) {
    const time = (pendingTimes[result.id] || "").trim();
    if (!time) return;
    setSavingTime((s) => ({ ...s, [result.id]: true }));
    try {
      const saved = await saveResult(result.race_id, { race_id: result.race_id, user_id: result.user_id, time_display: time });
      setMemberResults((prev) => prev.map((r) => r.id === result.id ? { ...r, time_display: saved.time_display } : r));
      setPendingTimes((p) => { const n = { ...p }; delete n[result.id]; return n; });
    } finally {
      setSavingTime((s) => ({ ...s, [result.id]: false }));
    }
  }

  async function handleSaveTrackResult(raceId, userId, event, resultVal) {
    const saved = await saveTrackResult(raceId, { race_id: raceId, user_id: userId, event, result_display: resultVal || null });
    setMemberTrackResults((prev) => {
      const idx = prev.findIndex((r) => r.race_id === raceId && r.event === event);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      const existingForRace = prev.find((r) => r.race_id === raceId);
      return [...prev, { ...saved, races: existingForRace?.races || null }];
    });
  }

  async function handleDeleteTrackResult(raceId, userId, event) {
    await deleteTrackResult(raceId, userId, event);
    setMemberTrackResults((prev) => prev.filter((r) => !(r.race_id === raceId && r.event === event)));
  }

  // ── Derived data for member detail ──────────────────────────────────────
  const memberGender = selectedMember?.gender || "man";

  const prs = {};
  memberResults.filter((r) => r.time_display).forEach((r) => {
    const dist = resolveXC(r.races?.distance, memberGender);
    if (!dist || r.races?.race_type === "track") return;
    if (!prs[dist] || parseSeconds(r.time_display) < parseSeconds(prs[dist].time_display)) prs[dist] = r;
  });
  const prList = DISTANCE_ORDER.filter((d) => prs[d]).concat(
    Object.keys(prs).filter((d) => !DISTANCE_ORDER.includes(d))
  );

  const trackPRs = {};
  memberTrackResults.filter((r) => r.result_display).forEach((r) => {
    if (!trackPRs[r.event] || isBetterTrackResult(r.event, r.result_display, trackPRs[r.event].result_display)) {
      trackPRs[r.event] = r;
    }
  });
  const trackPRList = Object.keys(trackPRs).sort((a, b) => {
    const ia = TRACK_EVENT_ORDER.indexOf(a), ib = TRACK_EVENT_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const trackByRace = {};
  memberTrackResults.forEach((tr) => {
    if (!trackByRace[tr.race_id]) trackByRace[tr.race_id] = [];
    trackByRace[tr.race_id].push(tr);
  });

  const totalPRs = prList.length + trackPRList.length;

  // ── Club records ────────────────────────────────────────────────────────
  const memberGenderMap = Object.fromEntries(members.map((m) => [m.id, m.gender || "man"]));
  const memberNameMap = Object.fromEntries(members.map((m) => [m.id, m.name]));

  const roadRecords = {};
  allResultsFlat.filter((r) => r.time_display).forEach((r) => {
    const gender = memberGenderMap[r.user_id] || "man";
    const dist = resolveXC(r.races?.distance, gender);
    if (!dist) return;
    if (!roadRecords[dist]) roadRecords[dist] = {};
    if (!roadRecords[dist][gender] || parseSeconds(r.time_display) < parseSeconds(roadRecords[dist][gender].time_display)) {
      roadRecords[dist][gender] = { ...r, memberName: memberNameMap[r.user_id] || "Unknown" };
    }
  });

  const trackRecords = {};
  allTrackFlat.filter((r) => r.result_display).forEach((r) => {
    const gender = memberGenderMap[r.user_id] || "man";
    if (!trackRecords[r.event]) trackRecords[r.event] = {};
    if (!trackRecords[r.event][gender] || isBetterTrackResult(r.event, r.result_display, trackRecords[r.event][gender].result_display)) {
      trackRecords[r.event][gender] = { ...r, memberName: memberNameMap[r.user_id] || "Unknown" };
    }
  });

  // ── Sorted member list ───────────────────────────────────────────────────
  const sortedMembers = [...members]
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortModes.includes("pending")) {
        const diff = (memberPendingCounts[b.id] || 0) - (memberPendingCounts[a.id] || 0);
        if (diff !== 0) return diff;
      }
      if (sortModes.includes("total")) {
        const diff = (memberRaceCounts[b.id] || 0) - (memberRaceCounts[a.id] || 0);
        if (diff !== 0) return diff;
      }
      if (sortModes.includes("last_name")) {
        const aLast = a.name.split(" ").slice(-1)[0].toLowerCase();
        const bLast = b.name.split(" ").slice(-1)[0].toLowerCase();
        return aLast.localeCompare(bLast);
      }
      return 0;
    });

  const filteredRaces = races.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));

  if (!club || loading) return <div className="page-loading">Loading...</div>;

  // ── Member detail view ───────────────────────────────────────────────────
  if (selectedMember) {
    const raceCount = memberResults.length;
    const timesCount = memberResults.filter((r) => r.time_display).length;
    const sortedResults = [...memberResults].sort(
      (a, b) => new Date(b.races?.date || b.created_at) - new Date(a.races?.date || a.created_at)
    );

    return (
      <div className="records">
        <button className="back-btn" onClick={() => setSelectedMember(null)}>← Back to Members</button>

        <div className="member-detail-header card">
          <div className="member-avatar-lg">{selectedMember.name[0].toUpperCase()}</div>
          <div className="member-detail-info" style={{ flex: 1 }}>
            <div className="member-detail-name">{selectedMember.name}</div>
            <div className="member-detail-email">{selectedMember.email}</div>
          </div>
          <div className="gender-toggle">
            <button
              className={`gender-btn ${memberGender === "man" ? "active" : ""}`}
              onClick={async () => {
                if (memberGender === "man") return;
                const updated = await updateUser(selectedMember.id, { gender: "man" });
                setSelectedMember((m) => ({ ...m, gender: updated.gender }));
                setMembers((ms) => ms.map((m) => m.id === updated.id ? { ...m, gender: updated.gender } : m));
              }}
            >Man</button>
            <button
              className={`gender-btn ${memberGender === "woman" ? "active" : ""}`}
              onClick={async () => {
                if (memberGender === "woman") return;
                const updated = await updateUser(selectedMember.id, { gender: "woman" });
                setSelectedMember((m) => ({ ...m, gender: updated.gender }));
                setMembers((ms) => ms.map((m) => m.id === updated.id ? { ...m, gender: updated.gender } : m));
              }}
            >Woman</button>
          </div>
        </div>

        <div className="stats-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat-card">
            <div className="stat-value">{raceCount}</div>
            <div className="stat-label">Races</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{timesCount}</div>
            <div className="stat-label">Times</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalPRs}</div>
            <div className="stat-label">PRs</div>
          </div>
        </div>

        <div className="view-tabs">
          <button
            className={`view-tab ${detailView === "history" ? "active" : ""}`}
            onClick={() => { setDetailView("history"); setSelectedPRDist(null); setSelectedTrackPREvent(null); }}
          >
            Race History
          </button>
          <button
            className={`view-tab ${detailView === "prs" ? "active" : ""}`}
            onClick={() => setDetailView("prs")}
          >
            PRs {totalPRs > 0 && `(${totalPRs})`}
          </button>
        </div>

        {resultsLoading ? (
          <p className="page-loading">Loading...</p>
        ) : detailView === "history" ? (
          <div className="card">
            {sortedResults.length === 0 ? (
              <p className="empty-state">No race history yet</p>
            ) : (
              sortedResults.map((result) => {
                const isTrack = result.races?.race_type === "track";
                return (
                  <div key={result.id} className={`record-row${isTrack ? " track-meet-row" : ""}`}>
                    <div className="session-type-dot race" style={{ flexShrink: 0, marginTop: isTrack ? 4 : 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="record-name">{result.races?.title || "Race"}</div>
                      <div className="record-sub">
                        {result.races?.date && new Date(result.races.date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                        {result.races?.distance && ` · ${isTrack ? "Track Meet" : resolveXC(result.races.distance, memberGender)}`}
                      </div>
                      {isTrack && (
                        <TrackEventsList
                          events={trackByRace[result.race_id] || []}
                          onAdd={(event, res) => handleSaveTrackResult(result.race_id, result.user_id, event, res)}
                          onEdit={(event, res) => handleSaveTrackResult(result.race_id, result.user_id, event, res)}
                          onDelete={(event) => handleDeleteTrackResult(result.race_id, result.user_id, event)}
                        />
                      )}
                    </div>
                    {!isTrack && (
                      result.time_display ? (
                        <div className="time-result-badge">{result.time_display}</div>
                      ) : result.id in pendingTimes ? (
                        <div className="inline-time-entry">
                          <input
                            className="inline-time-input"
                            placeholder="18:42"
                            autoFocus
                            value={pendingTimes[result.id]}
                            onChange={(e) => setPendingTimes((p) => ({ ...p, [result.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTime(result);
                              if (e.key === "Escape") setPendingTimes((p) => { const n = { ...p }; delete n[result.id]; return n; });
                            }}
                          />
                          <button className="inline-time-save" onClick={() => handleSaveTime(result)} disabled={savingTime[result.id]}>
                            {savingTime[result.id] ? "…" : "Save"}
                          </button>
                        </div>
                      ) : (
                        <button className="pending-badge" onClick={() => setPendingTimes((p) => ({ ...p, [result.id]: "" }))}>
                          ⏱ Enter Time
                        </button>
                      )
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* PRs Tab */
          <>
            {prList.length === 0 && trackPRList.length === 0 && (
              <div className="card"><p className="empty-state">No race times recorded yet</p></div>
            )}

            {/* Road / XC section */}
            {prList.length > 0 && (
              <>
                <div className="pr-section-header">Road / XC</div>
                <div className="card">
                  {prList.map((dist) => {
                    const r = prs[dist];
                    const isSelected = selectedPRDist === dist;
                    const histCount = memberResults.filter(
                      (res) => resolveXC(res.races?.distance, memberGender) === dist && res.time_display
                    ).length;
                    return (
                      <div
                        key={dist}
                        className={`pr-row pr-row-clickable${isSelected ? " pr-row-selected" : ""}`}
                        onClick={() => { setSelectedPRDist(isSelected ? null : dist); setSelectedTrackPREvent(null); }}
                      >
                        <div className="pr-left">
                          <div className="pr-distance">{dist}</div>
                          <div className="pr-hist-count">{histCount} result{histCount !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="pr-right">
                          <div className="pr-time">{r.time_display}</div>
                          <div className="pr-race-name">
                            {r.races?.title} · {r.races?.date && new Date(r.races.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        <span className="pr-chevron">{isSelected ? "▲" : "▼"}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedPRDist && (
                  <RoadChart results={memberResults} distance={selectedPRDist} gender={memberGender} />
                )}
              </>
            )}

            {/* Track section */}
            {trackPRList.length > 0 && (
              <>
                <div className={`pr-section-header${prList.length > 0 ? " pr-section-header-gap" : ""}`}>Track</div>
                <div className="card">
                  {trackPRList.map((event) => {
                    const r = trackPRs[event];
                    const isSelected = selectedTrackPREvent === event;
                    const isField = FIELD_EVENTS.has(event);
                    const histCount = memberTrackResults.filter((res) => res.event === event && res.result_display).length;
                    return (
                      <div
                        key={event}
                        className={`pr-row${!isField ? " pr-row-clickable" : ""}${isSelected ? " pr-row-selected" : ""}`}
                        onClick={() => {
                          if (isField) return;
                          setSelectedTrackPREvent(isSelected ? null : event);
                          setSelectedPRDist(null);
                        }}
                      >
                        <div className="pr-left">
                          <div className="pr-distance">{event}</div>
                          <div className="pr-hist-count">{histCount} result{histCount !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="pr-right">
                          <div className="pr-time">{r.result_display}</div>
                          <div className="pr-race-name">
                            {r.races?.title} · {r.races?.date && new Date(r.races.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>
                        {!isField && <span className="pr-chevron">{isSelected ? "▲" : "▼"}</span>}
                      </div>
                    );
                  })}
                </div>
                {selectedTrackPREvent && !FIELD_EVENTS.has(selectedTrackPREvent) && (
                  <TrackChart trackResults={memberTrackResults} event={selectedTrackPREvent} />
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Main list view ───────────────────────────────────────────────────────
  return (
    <div className="records">
      <h1 className="page-title">Race Records</h1>

      <div className="view-tabs">
        <button className={`view-tab ${view === "members" ? "active" : ""}`} onClick={() => { setView("members"); setSearch(""); }}>
          By Member
        </button>
        <button className={`view-tab ${view === "races" ? "active" : ""}`} onClick={() => { setView("races"); setSearch(""); }}>
          By Race
        </button>
        <button className={`view-tab ${view === "records" ? "active" : ""}`} onClick={() => { setView("records"); setSearch(""); }}>
          Club Records
        </button>
      </div>

      {view !== "records" && (
        <input
          className="search-input"
          placeholder={view === "members" ? "Search members..." : "Search races..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {view === "members" && (
        <>
          <div className="sort-row">
            <span className="sort-label">Sort:</span>
            <button className={`sort-pill ${sortModes.includes("total") ? "active" : ""}`} onClick={() => toggleSort("total")}>
              # of Races
            </button>
            <button className={`sort-pill ${sortModes.includes("last_name") ? "active" : ""}`} onClick={() => toggleSort("last_name")}>
              Last Name
            </button>
            <button className={`sort-pill ${sortModes.includes("pending") ? "active" : ""}`} onClick={() => toggleSort("pending")}>
              Pending Times
            </button>
          </div>
          <div className="card">
            {sortedMembers.length === 0 ? (
              <p className="empty-state">No members found</p>
            ) : (
              sortedMembers.map((member, i) => {
                const count = memberRaceCounts[member.id] || 0;
                const pendingCount = memberPendingCounts[member.id] || 0;
                return (
                  <div key={member.id} className="record-row record-row-clickable" onClick={() => handleSelectMember(member)}>
                    <div className="rank">#{i + 1}</div>
                    <div className="member-avatar">{member.name[0].toUpperCase()}</div>
                    <div className="record-info">
                      <div className="record-name">
                        {member.name}
                        {pendingCount > 0 && (
                          <span className="pending-count-badge" title={`${pendingCount} result${pendingCount !== 1 ? "s" : ""} missing time`}>
                            {pendingCount} ⏱
                          </span>
                        )}
                      </div>
                      <div className="record-sub">{member.email}</div>
                    </div>
                    <div className="record-count">{count} <span>races</span></div>
                    <span className="chevron">›</span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {view === "records" && (
        <>
          {/* Road / XC */}
          <div className="pr-section-header" style={{ marginTop: 4 }}>Road / XC</div>
          <div className="card cr-table">
            <div className="cr-header-row">
              <div className="cr-col-event">Distance</div>
              <div className="cr-col-record">Men</div>
              <div className="cr-col-record">Women</div>
            </div>
            {["5k", "10k", "Half Marathon", "Marathon", "XC"].map((dist) => {
              const isXC = dist === "XC";
              const menRec = isXC ? roadRecords["XC 8k"]?.man : roadRecords[dist]?.man;
              const womenRec = isXC ? roadRecords["XC 6k"]?.woman : roadRecords[dist]?.woman;
              if (!menRec && !womenRec) return null;
              return (
                <div key={dist} className="cr-row">
                  <div className="cr-col-event">
                    <div className="cr-dist-label">{dist}</div>
                    {isXC && <div className="cr-dist-note">Men 8k · Women 6k</div>}
                  </div>
                  <div className="cr-col-record">
                    {menRec ? <RecordCell rec={menRec} timeKey="time_display" /> : <span className="cr-empty">—</span>}
                  </div>
                  <div className="cr-col-record">
                    {womenRec ? <RecordCell rec={womenRec} timeKey="time_display" /> : <span className="cr-empty">—</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Track */}
          <div className="pr-section-header pr-section-header-gap">Track</div>
          <div className="card cr-table">
            <div className="cr-header-row">
              <div className="cr-col-event">Event</div>
              <div className="cr-col-record">Men</div>
              <div className="cr-col-record">Women</div>
            </div>
            {TRACK_EVENT_ORDER.filter((e) => trackRecords[e]?.man || trackRecords[e]?.woman).map((event) => (
              <div key={event} className="cr-row">
                <div className="cr-col-event">
                  <div className="cr-dist-label">{event}</div>
                </div>
                <div className="cr-col-record">
                  {trackRecords[event]?.man
                    ? <RecordCell rec={trackRecords[event].man} timeKey="result_display" />
                    : <span className="cr-empty">—</span>}
                </div>
                <div className="cr-col-record">
                  {trackRecords[event]?.woman
                    ? <RecordCell rec={trackRecords[event].woman} timeKey="result_display" />
                    : <span className="cr-empty">—</span>}
                </div>
              </div>
            ))}
          </div>

          {Object.keys(roadRecords).length === 0 && Object.keys(trackRecords).length === 0 && (
            <div className="card"><p className="empty-state">No results recorded yet</p></div>
          )}
        </>
      )}

      {view === "races" && (
        <div className="card">
          {filteredRaces.length === 0 ? (
            <p className="empty-state">No races yet</p>
          ) : (
            filteredRaces.map((race) => (
              <button key={race.id} className="run-item-btn" onClick={() => navigate(`/race/${race.id}`)}>
                <div>
                  <div className="run-title">{race.title}</div>
                  <div className="run-meta">
                    {new Date(race.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    {" · "}{race.distance}
                    {race.location && ` · ${race.location}`}
                  </div>
                </div>
                <span className="chevron">›</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
