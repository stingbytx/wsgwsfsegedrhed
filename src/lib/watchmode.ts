const BASE_URL = "https://api.watchmode.com/v1";

export interface WatchmodeSource {
  source_id: number;
  name: string;
  type: "sub" | "free" | "rent" | "buy" | "tve";
  region: string;
  web_url: string;
  format?: string;
  price?: number | null;
  logo_100px?: string;
}

async function watchmode<T = any>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const key = process.env.WATCHMODE_API_KEY;
  const url = new URL(BASE_URL + path);
  url.searchParams.set("apiKey", key || "");
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), { next: { revalidate: 21600 } });
  if (!res.ok) {
    throw new Error(`Watchmode ${path} failed: ${res.status}`);
  }
  return res.json();
}

// Watchmode indexes by its own ID, but supports lookup by TMDB ID via search.
export async function getWatchmodeIdFromTmdb(tmdbId: number, mediaType: "movie" | "tv") {
  const type = mediaType === "tv" ? "tv" : "movie";
  const data = await watchmode<{ title_results?: { id: number }[] }>(`/search/`, {
    search_field: `tmdb_${type}_id`,
    search_value: tmdbId,
  });
  return data.title_results?.[0]?.id;
}

export async function getWatchmodeSources(tmdbId: number, mediaType: "movie" | "tv", region = "US"): Promise<WatchmodeSource[]> {
  try {
    const watchmodeId = await getWatchmodeIdFromTmdb(tmdbId, mediaType);
    if (!watchmodeId) return [];
    const sources = await watchmode<WatchmodeSource[]>(`/title/${watchmodeId}/sources/`, { regions: region });
    return Array.isArray(sources) ? sources : [];
  } catch {
    return [];
  }
}
