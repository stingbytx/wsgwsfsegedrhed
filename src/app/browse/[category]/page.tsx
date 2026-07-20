import {
  getTrending,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getNowPlayingMovies,
  getPopularTv,
  getTopRatedTv,
  getOnTheAirTv,
  getAiringTodayTv,
} from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";

export const revalidate = 3600;

const CATEGORY_MAP: Record<string, { title: string; mediaType: "movie" | "tv"; fetcher: (page: number) => Promise<any> }> = {
  trending: { title: "Trending Today", mediaType: "movie", fetcher: (p) => getTrending("all", "day", p) },
  movies: { title: "Popular Movies", mediaType: "movie", fetcher: getPopularMovies },
  "top-rated": { title: "Top Rated Movies", mediaType: "movie", fetcher: getTopRatedMovies },
  upcoming: { title: "Upcoming Movies", mediaType: "movie", fetcher: getUpcomingMovies },
  "now-playing": { title: "Now Playing", mediaType: "movie", fetcher: getNowPlayingMovies },
  tv: { title: "Popular TV Shows", mediaType: "tv", fetcher: getPopularTv },
  "tv-top-rated": { title: "Top Rated TV Shows", mediaType: "tv", fetcher: getTopRatedTv },
  "on-the-air": { title: "On The Air", mediaType: "tv", fetcher: getOnTheAirTv },
  "airing-today": { title: "Airing Today", mediaType: "tv", fetcher: getAiringTodayTv },
};

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> };

export default async function BrowseCategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const { page = "1" } = await searchParams;
  const cfg = CATEGORY_MAP[category] || CATEGORY_MAP.movies;
  const data = await cfg.fetcher(Number(page));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">
        <span className="gradient-text">{cfg.title}</span>
      </h1>
      <div className="mt-6 flex flex-wrap gap-4">
        {data.results?.map((item: any) => (
          <MediaCard key={item.id} item={item} mediaType={cfg.mediaType} />
        ))}
      </div>
    </div>
  );
}
