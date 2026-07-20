export interface Genre {
  id: number;
  name: string;
}

export interface MediaBase {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  media_type?: "movie" | "tv" | "person";
  adult?: boolean;
  original_language?: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details: { rating: number | null; avatar_path: string | null };
}

export interface WatchProviders {
  results: Record<
    string,
    {
      link: string;
      flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
      rent?: { provider_id: number; provider_name: string; logo_path: string }[];
      buy?: { provider_id: number; provider_name: string; logo_path: string }[];
    }
  >;
}

export interface MovieDetails extends MediaBase {
  title: string;
  tagline: string;
  runtime: number;
  budget: number;
  revenue: number;
  status: string;
  genres: Genre[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { english_name: string }[];
  belongs_to_collection: { id: number; name: string; poster_path: string; backdrop_path: string } | null;
  videos: { results: Video[] };
  images: { backdrops: { file_path: string }[]; logos: { file_path: string }[]; posters: { file_path: string }[] };
  credits: { cast: CastMember[]; crew: CrewMember[] };
  recommendations: { results: MediaBase[] };
  similar: { results: MediaBase[] };
  reviews: { results: Review[] };
  keywords: { keywords: { id: number; name: string }[] };
  "watch/providers": WatchProviders;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average: number;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
  overview: string;
}

export interface TvDetails extends MediaBase {
  name: string;
  tagline: string;
  status: string;
  genres: Genre[];
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  seasons: Season[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  networks: { id: number; name: string; logo_path: string | null }[];
  videos: { results: Video[] };
  images: { backdrops: { file_path: string }[]; logos: { file_path: string }[]; posters: { file_path: string }[] };
  credits: { cast: CastMember[]; crew: CrewMember[] };
  recommendations: { results: MediaBase[] };
  similar: { results: MediaBase[] };
  reviews: { results: Review[] };
  keywords: { results: { id: number; name: string }[] };
  "watch/providers": WatchProviders;
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  images: { profiles: { file_path: string }[] };
  combined_credits: { cast: (MediaBase & { character?: string })[] };
  external_ids: { instagram_id?: string; twitter_id?: string; facebook_id?: string; imdb_id?: string };
}
