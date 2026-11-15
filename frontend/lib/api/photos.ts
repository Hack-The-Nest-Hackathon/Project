import { request } from "./client";

export type NasaPhoto = {
  sceneId: string; nasaId: string; title: string; credit: string; location?: string; imageUrl: string;
};

export function getNasaPhoto(sceneId: string, signal: AbortSignal) {
  return request<NasaPhoto>(`photos/${encodeURIComponent(sceneId)}`, { signal, timeout: 7_000 });
}

export function isNasaPhoto(value: unknown): value is NasaPhoto {
  if (!value || typeof value !== "object") return false;
  const photo = value as Partial<NasaPhoto>;
  return typeof photo.sceneId === "string" && typeof photo.nasaId === "string"
    && typeof photo.title === "string" && typeof photo.credit === "string"
    && typeof photo.imageUrl === "string" && photo.imageUrl.startsWith("https://images-assets.nasa.gov/image/")
    && (photo.location === undefined || typeof photo.location === "string");
}

export function nasaSource(photo: NasaPhoto) {
  return `https://images.nasa.gov/details/${encodeURIComponent(photo.nasaId)}`;
}
