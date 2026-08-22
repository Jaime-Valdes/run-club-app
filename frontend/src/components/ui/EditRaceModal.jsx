import { useState } from "react";
import { updateRace } from "../../api/races";
import { dateToEasternInputValue } from "../../utils/datetime";
import "./Modal.css";

export default function EditRaceModal({ race, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: race.title,
    date: dateToEasternInputValue(race.date),
    distance: race.distance,
    location: race.location || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await updateRace(race.id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update race.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal-title">Edit Race</h2>
        <div className="form-group">
          <label>Race Name</label>
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
          <label>Distance</label>
          <input required value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Location</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
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
