import { discover } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ name?: string; page?: string }> };

export default async function GenrePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { name, page = "1" } = await searchParams;
  const data = await discover("movie", { with_genres: id, sort_by: "popularity.desc", page });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">
        <span className="gradient-text">{name || "Genre"}</span> Movies
      </h1>
      <div className="mt-6 flex flex-wrap gap-4">
        {data.results?.map((item: any) => (
          <MediaCard key={item.id} item={item} mediaType="movie" />
        ))}
      </div>
    </div>
  );
}
