import { deleteRun } from "../api/runs";

export async function deleteRunWithConfirm(run) {
  if (!window.confirm(`Delete "${run.title}"? This will permanently remove it and all its attendance records.`)) {
    return false;
  }
  await deleteRun(run.id);
  return true;
}
