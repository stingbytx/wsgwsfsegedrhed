const BASE_URL = "https://api.themoviedb.org/3";
const IS_JWT = (process.env.TMDB_API_KEY || "").split(".").length === 3;

export const IMG = {
  original: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/original${p}` : ""),
  w1280: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w1280${p}` : ""),
  w780: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w780${p}` : ""),
  w500: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w500${p}` : ""),
  w342: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w342${p}` : ""),
  w185: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w185${p}` : ""),
  profile: (p?: string | null) => (p ? `https://image.tmdb.org/t/p/w300${p}` : ""),
};

async function tmdb<T = any>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidate = 3600
): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });

  const headers: Record<string, string> = { accept: "application/json" };
  if (IS_JWT) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    url.searchParams.set("api_key", key || "");
  }

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMDB ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ---- Lists ----
export const getTrending = (media: "all" | "movie" | "tv" = "all", window: "day" | "week" = "week", page = 1) =>
  tmdb(`/trending/${media}/${window}`, { page });

export const getPopularMovies = (page = 1) => tmdb("/movie/popular", { page });
export const getTopRatedMovies = (page = 1) => tmdb("/movie/top_rated", { page });
export const getUpcomingMovies = (page = 1) => tmdb("/movie/upcoming", { page });
export const getNowPlayingMovies = (page = 1) => tmdb("/movie/now_playing", { page });

export const getPopularTv = (page = 1) => tmdb("/tv/popular", { page });
export const getTopRatedTv = (page = 1) => tmdb("/tv/top_rated", { page });
export const getOnTheAirTv = (page = 1) => tmdb("/tv/on_the_air", { page });
export const getAiringTodayTv = (page = 1) => tmdb("/tv/airing_today", { page });

export const discoverByGenre = (genreId: number, media: "movie" | "tv" = "movie", page = 1) =>
  tmdb(`/discover/${media}`, { with_genres: genreId, sort_by: "popularity.desc", page });

export const discover = (
  media: "movie" | "tv",
  opts: Record<string, string | number | undefined> = {}
) => tmdb(`/discover/${media}`, opts);

export const getGenres = (media: "movie" | "tv" = "movie") => tmdb(`/genre/${media}/list`);

// ---- Details ----
export const getMovieDetails = (id: string | number) =>
  tmdb<import("@/types/tmdb").MovieDetails>(`/movie/${id}`, {
    append_to_response: "videos,images,credits,recommendations,similar,reviews,keywords,watch/providers",
  });

export const getTvDetails = (id: string | number) =>
  tmdb<import("@/types/tmdb").TvDetails>(`/tv/${id}`, {
    append_to_response: "videos,images,credits,recommendations,similar,reviews,keywords,watch/providers",
  });

export const getTvSeason = (id: string | number, season: number) =>
  tmdb(`/tv/${id}/season/${season}`);

export const getPersonDetails = (id: string | number) =>
  tmdb<import("@/types/tmdb").PersonDetails>(`/person/${id}`, { append_to_response: "images,combined_credits,external_ids" });

export const getCollection = (id: string | number) => tmdb(`/collection/${id}`);

// ---- Search ----
export const searchMulti = (query: string, page = 1) =>
  tmdb("/search/multi", { query, page, include_adult: "false" }, 60);

export const searchMovies = (query: string, page = 1) =>
  tmdb("/search/movie", { query, page }, 60);

export const searchTv = (query: string, page = 1) => tmdb("/search/tv", { query, page }, 60);
export const searchPeople = (query: string, page = 1) => tmdb("/search/person", { query, page }, 60);
export const searchCompanies = (query: string, page = 1) =>
  tmdb("/search/company", { query, page }, 60);
export const searchCollections = (query: string, page = 1) =>
  tmdb("/search/collection", { query, page }, 60);

export default tmdb;
