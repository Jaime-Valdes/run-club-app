export function formatTimeInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length < 4) return digits;
  if (digits.length <= 4) return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
  return `${digits.slice(0, digits.length - 4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}
