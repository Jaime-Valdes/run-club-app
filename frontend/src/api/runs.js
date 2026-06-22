import { api } from "./client";

export const getRuns = (clubId) => api.get(`/runs/?club_id=${clubId}`);
export const getRun = (runId) => api.get(`/runs/${runId}`);
export const createRun = (data, createdBy) =>
  api.post(createdBy ? `/runs/?created_by=${createdBy}` : `/runs/`, data);
