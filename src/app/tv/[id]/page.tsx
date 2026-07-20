import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star, Clock, Calendar } from "lucide-react";
import { getTvDetails, IMG } from "@/lib/tmdb";
import { yearOf } from "@/lib/utils";
import CastCarousel from "@/components/CastCarousel";
import DetailActions from "@/components/DetailActions";
import MediaRow from "@/components/MediaRow";
import SeasonSelector from "@/components/SeasonSelector";
import TrackRecentlyViewed from "@/components/TrackRecentlyViewed";
import WatchProviders from "@/components/WatchProviders";
import TvStreamSection from "@/components/TvStreamSection";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const tv = await getTvDetails(id);
    return { title: tv.name, description: tv.overview };
  } catch {
    return { title: "TV Show" };
  }
}

export default async function TvPage({ params }: Props) {
  const { id } = await params;
  let tv;
  try {
    tv = await getTvDetails(id);
  } catch {
    return notFound();
  }

  const creator = tv.created_by?.[0];
  const logo = tv.images?.logos?.find((l: any) => l.file_path.endsWith(".png"));

  return (
    <div>
      <TrackRecentlyViewed id={tv.id} media_type="tv" title={tv.name} poster_path={tv.poster_path} vote_average={tv.vote_average} />

      <div className="relative h-[60vh] min-h-[440px] w-full sm:h-[85vh]">
        {tv.backdrop_path && <Image src={IMG.original(tv.backdrop_path)} alt={tv.name} fill priority className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-transparent to-transparent" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end gap-4 px-4 pb-14 sm:flex-row sm:items-end sm:px-8">
          <div className="hidden w-52 shrink-0 overflow-hidden rounded-2xl glass shadow-2xl sm:block">
            {tv.poster_path && (
              <div className="relative aspect-[2/3]">
                <Image src={IMG.w500(tv.poster_path)} alt={tv.name} fill className="object-cover" />
              </div>
            )}
          </div>
          <div className="max-w-2xl">
            {logo ? (
              <div className="relative mb-3 h-20 w-64">
                <Image src={IMG.w500(logo.file_path)} alt={tv.name} fill className="object-contain object-left" />
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold sm:text-5xl font-display">{tv.name}</h1>
            )}
            {tv.tagline && <p className="mt-2 italic text-white/50">{tv.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1 text-warning">
                <Star size={13} fill="currentColor" /> {tv.vote_average?.toFixed(1)} ({tv.vote_count?.toLocaleString()})
              </span>
              <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1">
                <Clock size={13} /> {tv.episode_run_time?.[0] || "—"}m
              </span>
              <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1">
                <Calendar size={13} /> {yearOf(tv)}
              </span>
              {tv.genres?.map((g) => (
                <span key={g.id} className="rounded-full glass px-2.5 py-1">{g.name}</span>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70 sm:text-base">{tv.overview}</p>
            <div className="mt-6">
              <DetailActions id={tv.id} mediaType="tv" title={tv.name} poster_path={tv.poster_path} vote_average={tv.vote_average} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-10 px-4 py-10 sm:px-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Status", value: tv.status },
            { label: "Seasons", value: tv.number_of_seasons },
            { label: "Episodes", value: tv.number_of_episodes },
            { label: "Creator", value: creator?.name },
            { label: "Original Language", value: tv.original_language?.toUpperCase() },
            { label: "Popularity", value: tv.popularity?.toFixed(0) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl glass p-4">
              <p className="text-[11px] uppercase tracking-wide text-white/40">{s.label}</p>
              <p className="mt-1 text-sm font-semibold">{s.value || "—"}</p>
            </div>
          ))}
        </section>

        <section>
          <h3 className="mb-3 text-lg font-bold">Where to Watch</h3>
          <WatchProviders id={tv.id} mediaType="tv" tmdbProviders={tv["watch/providers"]?.results?.US} />
          <div className="mt-4">
            <TvStreamSection tvId={tv.id} seasons={tv.seasons} />
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-lg font-bold">Seasons & Episodes</h3>
          <SeasonSelector tvId={tv.id} seasons={tv.seasons} />
        </section>

        <section>
          <h3 className="mb-3 text-lg font-bold">Cast</h3>
          <CastCarousel cast={tv.credits?.cast || []} />
        </section>

        {tv.reviews?.results?.length > 0 && (
          <section>
            <h3 className="mb-3 text-lg font-bold">Reviews</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {tv.reviews.results.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-xl glass p-4">
                  <p className="mb-2 text-sm font-semibold">{r.author}</p>
                  <p className="line-clamp-5 text-sm text-white/60">{r.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <MediaRow title="Similar Shows" items={tv.similar?.results || []} mediaType="tv" />
        <MediaRow title="Recommended For You" items={tv.recommendations?.results || []} mediaType="tv" />
      </div>
    </div>
  );
}
