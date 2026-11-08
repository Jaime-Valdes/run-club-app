import "./DseStatusBadge.css";

const TONES = {
  approved: "good",
  "approved-active": "good",
  "approved-inactive": "neutral",
  archived: "neutral",
  "pending approval": "warn",
  "missing requirements": "warn",
  incomplete: "warn",
  disapproved: "bad",
  ineligible: "bad",
};

export default function DseStatusBadge({ status }) {
  if (!status) return <span className="dse-badge dse-badge-none">Not in DSE</span>;
  const tone = TONES[status.trim().toLowerCase()] || "neutral";
  return <span className={`dse-badge dse-badge-${tone}`}>{status}</span>;
}
