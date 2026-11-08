import { useState } from "react";
import { createUser } from "../../api/users";

const EMPTY_MEMBER = { firstName: "", lastName: "", netId: "" };

// Shared by practice and race check-in so the list behaves the same on both.
export default function CheckInRoster({
  members,
  checkedInIds,
  onToggle,
  onMemberCreated,
  error,
  toolbar,
  renderCheckedExtra,
}) {
  const [search, setSearch] = useState("");
  const [sortByLastName, setSortByLastName] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState(EMPTY_MEMBER);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  async function handleAddMember(e) {
    e.preventDefault();
    setAddingMember(true);
    setAddMemberError("");
    try {
      const name = `${newMember.firstName.trim()} ${newMember.lastName.trim()}`;
      const email = `${newMember.netId.trim().toLowerCase()}@nyu.edu`;
      const user = await createUser({ name, email });
      await onMemberCreated(user);
      setNewMember(EMPTY_MEMBER);
      setShowAddMember(false);
    } catch (err) {
      setAddMemberError(err.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  }

  const filteredMembers = members
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortByLastName) {
        const aLast = a.name.split(" ").slice(-1)[0].toLowerCase();
        const bLast = b.name.split(" ").slice(-1)[0].toLowerCase();
        return aLast.localeCompare(bLast);
      }
      return a.name.localeCompare(b.name);
    });

  const checkedInMembers = filteredMembers.filter((m) => checkedInIds.includes(m.id));
  const notCheckedInMembers = filteredMembers.filter((m) => !checkedInIds.includes(m.id));

  return (
    <>
      <div className="sort-row">
        <span className="sort-label">Sort By:</span>
        <button
          className={`sort-pill ${sortByLastName ? "active" : ""}`}
          onClick={() => setSortByLastName((v) => !v)}
        >
          Last Name
        </button>
        {toolbar}
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

      {error && <p className="form-error">{error}</p>}

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
                {renderCheckedExtra?.(member)}
                <button className="checkin-btn checked" onClick={() => onToggle(member.id)}>
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
                <button className="checkin-btn" onClick={() => onToggle(member.id)}>
                  Check In
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
