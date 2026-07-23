import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Attach JWT token automatically once auth (Day 2) is built
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
