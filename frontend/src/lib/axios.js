import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'production'
    ? `${import.meta.env.VITE_API_BASE_URL}/api` 
    : "http://localhost:3000/api",
  withCredentials: true,
});
