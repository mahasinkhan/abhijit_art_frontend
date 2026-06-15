import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ These must be named exports — NOT inside any object
export const fetchPosts = () =>
  api.get("/posts").then((res) => res.data);

export const createPost = (formData: FormData, fileType: "image" | "video") =>
  api
    .post(`/posts/${fileType}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((res) => res.data);

export const deletePost = (id: string) =>
  api.delete(`/posts/${id}`).then((res) => res.data);

export default api;