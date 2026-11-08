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

function easternOffset(date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName").value;
  return name.replace("GMT", "");
}

// Turns a datetime-local value entered as Eastern time into a timestamp with its offset.
export function easternInputToISO(value) {
  const estimate = easternOffset(new Date(`${value}Z`));
  return `${value}:00${easternOffset(new Date(`${value}${estimate}`))}`;
}
