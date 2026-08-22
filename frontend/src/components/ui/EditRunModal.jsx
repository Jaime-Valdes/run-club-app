import { useState } from "react";
import { updateRun } from "../../api/runs";
import { dateToEasternInputValue } from "../../utils/datetime";
import "./Modal.css";

export default function EditRunModal({ run, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: run.title,
    date: dateToEasternInputValue(run.date),
    notes: run.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateRun(run.id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-title">Edit Practice</h2>
        <div className="form-group">
          <label>Session Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Date & Time</label>
          <input
            type="datetime-local"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
