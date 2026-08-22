function toEasternInputValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowEastern() {
  return toEasternInputValue(new Date());
}

export function dateToEasternInputValue(isoString) {
  return toEasternInputValue(new Date(isoString));
}
