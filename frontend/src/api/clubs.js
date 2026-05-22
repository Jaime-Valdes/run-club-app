import { api } from "./client";

export const getClubs = () => api.get("/clubs/");
export const createClub = (data) => api.post("/clubs/", data);
export const getMembers = (clubId) => api.get(`/clubs/${clubId}/members`);
export const addMember = (clubId, data) => api.post(`/clubs/${clubId}/members`, data);
export const removeMember = (clubId, userId) => api.delete(`/clubs/${clubId}/members/${userId}`);
