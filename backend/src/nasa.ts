import { world } from "./world.js";

export type NasaPhoto = {
  sceneId: string;
  nasaId: string;
  title: string;
  credit: string;
  location?: string;
  imageUrl: string;
};

const subjects: [subject: string, context: string, nasaId?: string][] = [
  ["Blue Marble", "Earth"], ["Moon", "Apollo lunar surface"], ["Europa", "Galileo ice"], ["Jezero", "Mars delta"], ["Mercury", "MESSENGER"],
  ["Great Red Spot", "Juno"], ["Venus", "Magellan surface"], ["Neptune", "Voyager"], ["Saturn", "Cassini rings"], ["Titan", "Cassini"],
  ["Io", "Galileo volcano"], ["Uranus", "Voyager"], ["Enceladus", "Cassini geysers"], ["Ceres", "Dawn Occator"], ["Valles Marineris", "Mars"],
  ["Pluto", "New Horizons Sputnik"], ["Pillars of Creation", "Webb"], ["Vesta", "Dawn asteroid"], ["Mount Sharp", "Mars Curiosity"],
  ["Orion Nebula", "Hubble"], ["Carina Nebula", "Webb"], ["Andromeda", "galaxy Hubble"], ["Comet 67P", "Rosetta"], ["Bennu", "OSIRIS REx"],
  ["Triton", "Voyager"], ["Crab Nebula", "Hubble"], ["Sombrero Galaxy", "Hubble", "0700065"],
];

const nasaIdPattern = /^[a-z0-9][a-z0-9._-]{0,119}$/i;
const archive = new Map(world.map(({ id }, index) => [id, subjects[index]]));
const cache = new Map<string, Promise<NasaPhoto>>();

export function isNasaImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.origin === "https://images-assets.nasa.gov" && url.pathname.startsWith("/image/")
      && !url.username && !url.password;
  } catch {
    return false;
  }
}

type Asset = {
  data?: { nasa_id?: string; title?: string; center?: string; location?: string; photographer?: string; secondary_creator?: string }[];
  links?: { href?: string; rel?: string }[];
};

function clean(label: unknown, max: number) {
  return typeof label === "string" ? label.replace(/<br\s*\/?>/gi, " · ").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function searchPhoto(sceneId: string, [subject, context, pinnedId]: typeof subjects[number]): Promise<NasaPhoto> {
  const url = new URL("https://images-api.nasa.gov/search");
  url.search = new URLSearchParams({
    ...(pinnedId ? { nasa_id: pinnedId } : { q: `${subject} ${context}` }),
    media_type: "image", page_size: "25",
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error("NASA search unavailable");
  const payload = await response.json() as { collection?: { items?: Asset[] } };
  const matchSubject = new RegExp(`\\b${subject.toLowerCase()}\\b`);
  const items = payload.collection?.items ?? [];
  const ranked = [...items].sort((a, b) =>
    Number(matchSubject.test(clean(b.data?.[0]?.title, 180).toLowerCase()))
    - Number(matchSubject.test(clean(a.data?.[0]?.title, 180).toLowerCase())));
  for (const item of ranked) {
    const metadata = item.data?.[0];
    const nasaId = clean(metadata?.nasa_id, 120);
    const title = clean(metadata?.title, 180);
    const imageUrl = item.links?.filter(({ rel }) => rel === "preview")
      .map(({ href }) => typeof href === "string" ? href.replace(/^http:\/\/images-assets\.nasa\.gov\//i, "https://images-assets.nasa.gov/") : "")
      .find(isNasaImageUrl);
    if (!nasaIdPattern.test(nasaId) || !title || !imageUrl || imageUrl.length > 500
      || /\b(?:illustration|artist.s (?:concept|impression|rendering)|diagram|infographic|poster|simulation|map)\b/i.test(title)) continue;
    const location = clean(metadata?.location, 140);
    return {
      sceneId, nasaId, title, imageUrl,
      credit: clean(metadata?.photographer, 160) || clean(metadata?.secondary_creator, 160)
        || ["NASA", clean(metadata?.center, 20)].filter(Boolean).join(" · "),
      ...(location ? { location } : {}),
    };
  }
  throw new Error("No photo found in NASA archive");
}

export function getNasaPhoto(sceneId: string) {
  const subject = archive.get(sceneId);
  if (!subject) return undefined;
  let photo = cache.get(sceneId);
  if (!photo) {
    photo = searchPhoto(sceneId, subject).catch((error: unknown) => {
      cache.delete(sceneId);
      throw error;
    });
    cache.set(sceneId, photo);
  }
  return photo;
}
