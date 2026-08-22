import { deleteRace } from "../api/races";

export async function deleteRaceWithConfirm(race) {
  if (!window.confirm(`Delete "${race.title}"? This will permanently remove it and all its results.`)) {
    return false;
  }
  await deleteRace(race.id);
  return true;
}
