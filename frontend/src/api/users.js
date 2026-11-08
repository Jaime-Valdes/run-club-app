import { api } from "./client";

export const getUsers = () => api.get("/users/");
export const createUser = (data) => api.post("/users/", data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const importDseStatuses = (statuses, links) => api.post("/users/dse-statuses", { statuses, links });
