import { useState } from "react";
import { createUser, importDseStatuses } from "../../api/users";
import { matchDseRoster, parseDseRoster, suggestMembers } from "../../utils/dse";
import { pluralize } from "../../utils/format";
import DseStatusBadge from "./DseStatusBadge";
import "./Modal.css";
import "./ImportDseModal.css";

const SKIP = "skip";
const ADD = "add";
const SEARCH = "search";
const MEMBER_LIST_ID = "dse-member-options";

const memberLabel = (m) => `${m.name} (${(m.email || "").split("@")[0]})`;

function RosterPerson({ row }) {
  return (
    <div className="dse-import-who">
      <div className="dse-import-name">
        {row.name}
        <DseStatusBadge status={row.status} />
      </div>
      <div className="dse-import-email">{row.email}</div>
    </div>
  );
}

function UnmatchedRow({ row, choice, suggestions, search, onChoice, onSearch }) {
  const hint = suggestions.length
    ? ` · ${suggestions.length} possible ${suggestions.length === 1 ? "match" : "matches"}`
    : "";
  return (
    <div className="dse-import-row">
      <RosterPerson row={row} />
      <div className="dse-import-action">
        <select aria-label={`Action for ${row.name}`} value={choice} onChange={(e) => onChoice(e.target.value)}>
          <option value={SKIP}>Leave off{hint}</option>
          {suggestions.map((m) => (
            <option key={m.id} value={m.id}>Link to {memberLabel(m)}</option>
          ))}
          <option value={SEARCH}>Link to another member…</option>
          {row.name && <option value={ADD}>Add as new member</option>}
        </select>
        {choice === SEARCH && (
          <input
            list={MEMBER_LIST_ID}
            aria-label={`Member to link to ${row.name}`}
            placeholder="Type a member's name"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export default function ImportDseModal({ members, onClose, onImported, onMemberAdded }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState({});
  const [searches, setSearches] = useState({});
  const [rejected, setRejected] = useState(() => new Set());

  const rows = text.trim() ? parseDseRoster(text) : undefined;
  const unreadable = rows === null || rows?.length === 0;
  const match = rows?.length ? matchDseRoster(rows, members, rejected) : null;

  const autoMatchedIds = new Set(match ? Object.keys(match.statuses) : []);
  const available = members.filter((m) => !autoMatchedIds.has(m.id));
  const availableById = new Map(available.map((m) => [m.id, m]));
  const availableByLabel = new Map(available.map((m) => [memberLabel(m), m]));

  const choiceFor = (row) => choices[row.email] ?? SKIP;

  function linkedMember(row) {
    const choice = choiceFor(row);
    if (choice === SEARCH) return availableByLabel.get(searches[row.email]) ?? null;
    return availableById.get(choice) ?? null;
  }

  const unmatched = match?.unmatched ?? [];
  const links = unmatched.map((row) => [row, linkedMember(row)]).filter(([, member]) => member);
  const linkedBy = new Map(links.map(([row, member]) => [member.id, row.email]));
  const addCount = unmatched.filter((row) => choiceFor(row) === ADD).length;
  const leftOffCount = unmatched.filter((row) => choiceFor(row) === SKIP).length;

  const matchedCount = autoMatchedIds.size + links.length;
  const totalCount = matchedCount + addCount;
  const previousCount = members.filter((m) => m.dse_status).length;
  const looksPartial = match && previousCount > 0 && totalCount < previousCount / 2;

  function suggestionsFor(row) {
    return suggestMembers(row, available.filter((m) => !linkedBy.has(m.id) || linkedBy.get(m.id) === row.email));
  }

  function setChoice(row, value) {
    setChoices((prev) => ({ ...prev, [row.email]: value }));
  }

  function rejectNameMatch(row) {
    setRejected((prev) => new Set(prev).add(row.email));
  }

  function addAllRemaining() {
    setChoices((prev) => {
      const next = { ...prev };
      unmatched.forEach((row) => {
        if (row.name && (prev[row.email] ?? SKIP) === SKIP) next[row.email] = ADD;
      });
      return next;
    });
  }

  async function handleImport() {
    setSaving(true);
    setError("");
    try {
      // Only member IDs, statuses, and manually linked emails leave the browser,
      // plus the name and email of anyone being added. Phone numbers never do.
      const statuses = { ...match.statuses };
      const savedLinks = {};
      links.forEach(([row, member]) => {
        statuses[member.id] = row.status;
        savedLinks[member.id] = row.email;
      });
      for (const row of unmatched.filter((r) => choiceFor(r) === ADD)) {
        const user = await createUser({ name: row.name, email: row.email });
        onMemberAdded(user);
        statuses[user.id] = row.status;
      }
      await importDseStatuses(statuses, savedLinks);
      onImported(statuses, savedLinks);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to import the roster.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card dse-import-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Import DSE Roster</h2>
        <p className="dse-import-help">
          Open the DSE roster and show every member. Press Cmd-A, then Cmd-C, and paste below.
        </p>
        <textarea
          className="dse-import-text"
          placeholder="Paste the whole roster page here"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />

        {unreadable && (
          <p className="form-error">Couldn't find the roster table in that text. Copy the whole roster page and try again.</p>
        )}

        {match && (
          <div className="dse-import-preview">
            <ul className="dse-import-summary">
              <li><strong>{rows.length}</strong> {rows.length === 1 ? "person" : "people"} on the DSE roster</li>
              <li><strong>{matchedCount}</strong> matched to members</li>
              {addCount > 0 && <li><strong>{addCount}</strong> new {pluralize(addCount, "member")} will be added</li>}
              <li><strong>{members.length - matchedCount}</strong> {pluralize(members.length - matchedCount, "member")} will show Not in DSE</li>
            </ul>

            {match.nameMatches.length > 0 && (
              <section className="dse-import-section">
                <h3>Matched by name: please check ({match.nameMatches.length})</h3>
                <p className="dse-import-hint">Their DSE email isn't the one in the app, so these were matched on name alone.</p>
                <div className="dse-import-list">
                  {match.nameMatches.map((row) => (
                    <div key={row.email} className="dse-import-row">
                      <RosterPerson row={row} />
                      <div className="dse-import-action">
                        <select
                          aria-label={`Is ${row.name} the same person?`}
                          value="same"
                          onChange={(e) => e.target.value === "different" && rejectNameMatch(row)}
                        >
                          <option value="same">Same as {memberLabel(row.member)}</option>
                          <option value="different">Not the same person</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {unmatched.length > 0 && (
              <section className="dse-import-section">
                <h3>
                  <span>On the roster, no member found ({unmatched.length})</span>
                  {leftOffCount > 0 && (
                    <button type="button" className="dse-import-addall" onClick={addAllRemaining}>
                      Add all as new
                    </button>
                  )}
                </h3>
                <p className="dse-import-hint">Link each person to a member, add them, or leave them off. Links are remembered for next time.</p>
                <div className="dse-import-list">
                  {unmatched.map((row) => (
                    <UnmatchedRow
                      key={row.email}
                      row={row}
                      choice={choiceFor(row)}
                      suggestions={suggestionsFor(row)}
                      search={searches[row.email] ?? ""}
                      onChoice={(value) => setChoice(row, value)}
                      onSearch={(value) => setSearches((prev) => ({ ...prev, [row.email]: value }))}
                    />
                  ))}
                </div>
                <datalist id={MEMBER_LIST_ID}>
                  {available.map((m) => <option key={m.id} value={memberLabel(m)} />)}
                </datalist>
              </section>
            )}

            {looksPartial && (
              <p className="form-error">
                That's far fewer than the {previousCount} statuses saved now. Make sure every member was showing before you copied.
              </p>
            )}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="modal-save-btn" onClick={handleImport} disabled={saving || totalCount === 0}>
            {saving ? "Importing..." : "Import statuses"}
          </button>
        </div>
      </div>
    </div>
  );
}
