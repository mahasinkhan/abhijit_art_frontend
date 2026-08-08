import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ✅ AUTH — named exports
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });

export const register = (email: string, password: string, name: string, phone?: string) =>
  api.post("/api/auth/register", { email, password, name, phone });

export const getCurrentUser = () =>
  api.get("/api/auth/me");

// ✅ POSTS — named exports
export const fetchPosts = () =>
  api.get("/api/posts");

export const createPost = (formData: FormData, fileType: "image" | "video") =>
  api.post(`/api/posts/${fileType}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deletePost = (id: string) =>
  api.delete(`/api/posts/${id}`);

export default api;