import { useState } from "react";
import { updateUser } from "../../api/users";
import "./Modal.css";

export default function EditMemberModal({ member, onClose, onSaved }) {
  const [form, setForm] = useState({ name: member.name, email: member.email });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateUser(member.id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-title">Edit Member</h2>
        <div className="form-group">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="modal-save-btn" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
