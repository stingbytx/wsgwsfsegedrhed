"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MediaCard from "@/components/MediaCard";
import { RowSkeleton } from "@/components/Skeletons";
import { IMG } from "@/lib/tmdb";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "movie" | "tv" | "person">("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results || []))
      .finally(() => setLoading(false));
  }, [q]);

  const filtered = filter === "all" ? results : results.filter((r) => r.media_type === filter);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">
        Search results for <span className="gradient-text">"{q}"</span>
      </h1>
      <div className="mt-4 flex gap-2">
        {(["all", "movie", "tv", "person"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm capitalize transition-colors ${
              filter === f ? "gradient-brand" : "glass text-white/60 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <RowSkeleton />
      ) : (
        <div className="mt-6 flex flex-wrap gap-4">
          {filtered.map((item) =>
            item.media_type === "person" ? (
              <Link key={`person-${item.id}`} href={`/person/${item.id}`} className="w-[160px] shrink-0 text-center sm:w-[190px]">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl glass">
                  {item.profile_path && <Image src={IMG.w500(item.profile_path)} alt={item.name} fill className="object-cover" />}
                </div>
                <p className="mt-2 text-sm font-medium">{item.name}</p>
              </Link>
            ) : (
              <MediaCard key={`${item.media_type}-${item.id}`} item={item} mediaType={item.media_type} />
            )
          )}
          {filtered.length === 0 && <p className="text-white/40">No results found.</p>}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<RowSkeleton />}>
      <SearchResults />
    </Suspense>
  );
}
