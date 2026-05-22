import { api } from "./client";

export const checkIn = (runId, userId) =>
  api.post("/attendance/", { run_id: runId, user_id: userId });
export const checkOut = (runId, userId) =>
  api.delete(`/attendance/?run_id=${runId}&user_id=${userId}`);
export const getAttendanceForRun = (runId) =>
  api.get(`/attendance/run/${runId}`);
export const getAttendanceForUser = (userId) =>
  api.get(`/attendance/user/${userId}`);
export const getAttendanceCount = (userId) =>
  api.get(`/attendance/user/${userId}/count`);
