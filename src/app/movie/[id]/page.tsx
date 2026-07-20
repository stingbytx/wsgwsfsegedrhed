import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star, Clock, Calendar, DollarSign, Globe } from "lucide-react";
import { getMovieDetails } from "@/lib/tmdb";
import { IMG } from "@/lib/tmdb";
import { formatRuntime, formatMoney, formatDate, yearOf } from "@/lib/utils";
import CastCarousel from "@/components/CastCarousel";
import DetailActions from "@/components/DetailActions";
import MediaRow from "@/components/MediaRow";
import TrackRecentlyViewed from "@/components/TrackRecentlyViewed";
import WatchProviders from "@/components/WatchProviders";
import StreamPlayer from "@/components/StreamPlayer";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const movie = await getMovieDetails(id);
    return {
      title: movie.title,
      description: movie.overview,
      openGraph: {
        title: movie.title,
        description: movie.overview,
        images: movie.backdrop_path ? [IMG.w1280(movie.backdrop_path)] : [],
      },
    };
  } catch {
    return { title: "Movie" };
  }
}

export default async function MoviePage({ params }: Props) {
  const { id } = await params;
  let movie;
  try {
    movie = await getMovieDetails(id);
  } catch {
    return notFound();
  }

  const director = movie.credits?.crew?.find((c: any) => c.job === "Director");
  const writers = movie.credits?.crew?.filter((c: any) => c.job === "Writer" || c.job === "Screenplay").slice(0, 2);
  const producers = movie.credits?.crew?.filter((c: any) => c.job === "Producer").slice(0, 2);
  const providers = movie["watch/providers"]?.results?.US;
  const logo = movie.images?.logos?.find((l: any) => l.file_path.endsWith(".png"));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    image: IMG.w780(movie.poster_path),
    datePublished: movie.release_date,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: movie.vote_average,
      ratingCount: movie.vote_count,
    },
  };

  return (
    <div>
      <TrackRecentlyViewed
        id={movie.id}
        media_type="movie"
        title={movie.title}
        poster_path={movie.poster_path}
        vote_average={movie.vote_average}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative h-[60vh] min-h-[440px] w-full sm:h-[85vh]">
        {movie.backdrop_path && (
          <Image src={IMG.original(movie.backdrop_path)} alt={movie.title} fill priority className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-transparent to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end gap-4 px-4 pb-14 sm:flex-row sm:items-end sm:px-8">
          <div className="hidden w-52 shrink-0 overflow-hidden rounded-2xl glass shadow-2xl sm:block">
            {movie.poster_path && (
              <div className="relative aspect-[2/3]">
                <Image src={IMG.w500(movie.poster_path)} alt={movie.title} fill className="object-cover" />
              </div>
            )}
          </div>
          <div className="max-w-2xl">
            {logo ? (
              <div className="relative mb-3 h-20 w-64">
                <Image src={IMG.w500(logo.file_path)} alt={movie.title} fill className="object-contain object-left" />
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold sm:text-5xl font-display">{movie.title}</h1>
            )}
            {movie.tagline && <p className="mt-2 italic text-white/50">{movie.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1 text-warning">
                <Star size={13} fill="currentColor" /> {movie.vote_average?.toFixed(1)} ({movie.vote_count?.toLocaleString()})
              </span>
              <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1">
                <Clock size={13} /> {formatRuntime(movie.runtime)}
              </span>
              <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1">
                <Calendar size={13} /> {yearOf(movie)}
              </span>
              {movie.genres?.map((g) => (
                <span key={g.id} className="rounded-full glass px-2.5 py-1">{g.name}</span>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70 sm:text-base">{movie.overview}</p>
            <div className="mt-6">
              <DetailActions id={movie.id} mediaType="movie" title={movie.title} poster_path={movie.poster_path} vote_average={movie.vote_average} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-10 px-4 py-10 sm:px-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Status", value: movie.status },
            { label: "Original Language", value: movie.original_language?.toUpperCase() },
            { label: "Budget", value: formatMoney(movie.budget) },
            { label: "Revenue", value: formatMoney(movie.revenue) },
            { label: "Release Date", value: formatDate(movie.release_date) },
            { label: "Popularity", value: movie.popularity?.toFixed(0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl glass p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/40">{s.label}</p>
              <p className="mt-1 text-sm font-semibold">{s.value || "—"}</p>
            </div>
          ))}
        </section>

        {director && (
          <section className="flex flex-wrap gap-8 text-sm">
            <div>
              <p className="text-white/40">Director</p>
              <p className="font-semibold">{director.name}</p>
            </div>
            {writers?.map((w) => (
              <div key={w.id}>
                <p className="text-white/40">Writer</p>
                <p className="font-semibold">{w.name}</p>
              </div>
            ))}
            {producers?.map((p) => (
              <div key={p.id}>
                <p className="text-white/40">Producer</p>
                <p className="font-semibold">{p.name}</p>
              </div>
            ))}
          </section>
        )}

        <section>
          <h3 className="mb-3 text-lg font-bold">Where to Watch</h3>
          <WatchProviders id={movie.id} mediaType="movie" tmdbProviders={providers} />
          <div className="mt-4">
            <StreamPlayer tmdbId={movie.id} mediaType="movie" />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-lg font-bold">Cast</h3>
          <CastCarousel cast={movie.credits?.cast || []} />
        </section>

        {movie.images?.backdrops?.length > 0 && (
          <section>
            <h3 className="mb-3 text-lg font-bold">Gallery</h3>
            <div className="no-scrollbar flex gap-3 overflow-x-auto">
              {movie.images.backdrops.slice(0, 10).map((img, i) => (
                <div key={i} className="relative h-40 w-72 shrink-0 overflow-hidden rounded-xl glass">
                  <Image src={IMG.w780(img.file_path)} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {movie.reviews?.results?.length > 0 && (
          <section>
            <h3 className="mb-3 text-lg font-bold">Reviews</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {movie.reviews.results.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-xl glass p-4">
                  <p className="mb-2 text-sm font-semibold">{r.author}</p>
                  <p className="line-clamp-5 text-sm text-white/60">{r.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <MediaRow title="Similar Movies" items={movie.similar?.results || []} mediaType="movie" />
        <MediaRow title="Recommended For You" items={movie.recommendations?.results || []} mediaType="movie" />
      </div>
    </div>
  );
}
