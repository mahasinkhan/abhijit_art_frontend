import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export type HeroSlide = {
  id: string;
  imageUrl: string;
  publicId: string;
  alt: string;
  eyebrow: string;
  titleTop: string;
  titleBottom: string;
  subtitle: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HeroSlidePatch = {
  alt?: string;
  eyebrow?: string;
  titleTop?: string;
  titleBottom?: string;
  subtitle?: string;
  active?: boolean;
  order?: number;
};

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: "Bearer " + token } : {};
};

export const fetchHeroSlides = async (): Promise<HeroSlide[]> => {
  const { data } = await axios.get<HeroSlide[]>(API_BASE + "/api/hero");
  return Array.isArray(data) ? data : [];
};

export const fetchAllHeroSlides = async (): Promise<HeroSlide[]> => {
  const { data } = await axios.get<HeroSlide[]>(API_BASE + "/api/hero/all", { headers: authHeaders() });
  return Array.isArray(data) ? data : [];
};

export const createHeroSlide = (form: FormData) =>
  axios.post<HeroSlide>(API_BASE + "/api/hero", form, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });

export const updateHeroSlide = (id: string, patch: HeroSlidePatch) =>
  axios.patch<HeroSlide>(API_BASE + "/api/hero/" + id, patch, { headers: authHeaders() });

export const replaceHeroImage = (id: string, form: FormData) =>
  axios.put<HeroSlide>(API_BASE + "/api/hero/" + id + "/image", form, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });

export const reorderHeroSlides = (ids: string[]) =>
  axios.patch<HeroSlide[]>(API_BASE + "/api/hero/reorder", { ids }, { headers: authHeaders() });

export const deleteHeroSlide = (id: string) =>
  axios.delete(API_BASE + "/api/hero/" + id, { headers: authHeaders() });
