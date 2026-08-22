export function toggleSortMode(setSortModes, mode) {
  setSortModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
}
