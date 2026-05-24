import { api } from "./client";

export const createRace = (data) => api.post("/races/", data);
export const getRaces = (clubId) => api.get(`/races/?club_id=${clubId}`);
export const getRace = (raceId) => api.get(`/races/${raceId}`);
export const saveResult = (raceId, data) => api.post(`/races/${raceId}/results`, data);
export const getResults = (raceId) => api.get(`/races/${raceId}/results`);
export const deleteResult = (raceId, userId) => api.delete(`/races/${raceId}/results/${userId}`);
export const getUserResults = (userId) => api.get(`/races/user/${userId}/results`);
export const getTrackResults = (raceId) => api.get(`/races/${raceId}/track-results`);
export const getUserTrackResults = (userId) => api.get(`/races/user/${userId}/track-results`);
export const saveTrackResult = (raceId, data) => api.post(`/races/${raceId}/track-results`, data);
export const deleteTrackResult = (raceId, userId, event) => api.delete(`/races/${raceId}/track-results/${userId}/${encodeURIComponent(event)}`);
