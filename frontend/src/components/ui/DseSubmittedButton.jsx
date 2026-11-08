import { useState } from "react";
import { updateRace } from "../../api/races";
import { updateRun } from "../../api/runs";
import "./DseSubmittedButton.css";

export default function DseSubmittedButton({ session, type, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitted = !!session.dse_submitted;

  async function toggle() {
    setSaving(true);
    setError("");
    try {
      const update = type === "race" ? updateRace : updateRun;
      onSaved(await update(session.id, { dse_submitted: !submitted }));
    } catch (err) {
      setError(err.message || "Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dse-submitted" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`dse-submitted-btn${submitted ? " checked" : ""}`}
        aria-pressed={submitted}
        disabled={saving}
        onClick={toggle}
      >
        {submitted ? "✓" : "☐"} DSE Roster Submitted
      </button>
      {error && <span className="dse-submitted-error">{error}</span>}
    </div>
  );
}
