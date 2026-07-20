"use client";

import { useState } from "react";
import { Play, Plus, Check, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/store/useLibrary";
import TrailerModal from "./TrailerModal";

export default function DetailActions({
  id,
  mediaType,
  title,
  poster_path,
  vote_average,
}: {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  poster_path: string | null;
  vote_average: number;
}) {
  const [showTrailer, setShowTrailer] = useState(false);
  const { toggleWatchlist, toggleFavorite, isInWatchlist, isInFavorites } = useLibrary();
  const inWatchlist = isInWatchlist(id, mediaType);
  const inFavorites = isInFavorites(id, mediaType);
  const item = { id, media_type: mediaType, title, poster_path, vote_average };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={() => setShowTrailer(true)}
        className="flex items-center gap-2 rounded-full gradient-brand px-6 py-3 text-sm font-semibold glow-primary transition-transform hover:scale-105"
      >
        <Play size={16} fill="currentColor" /> Watch Trailer
      </button>
      <button
        onClick={() => toggleWatchlist(item)}
        className={cn("flex items-center gap-2 rounded-full glass px-5 py-3 text-sm font-semibold transition-transform hover:scale-105", inWatchlist && "text-secondary")}
      >
        {inWatchlist ? <Check size={16} /> : <Plus size={16} />} {inWatchlist ? "In Watchlist" : "Add Watchlist"}
      </button>
      <button
        onClick={() => toggleFavorite(item)}
        className={cn("flex h-11 w-11 items-center justify-center rounded-full glass transition-transform hover:scale-110", inFavorites && "text-accent")}
      >
        <Heart size={18} fill={inFavorites ? "currentColor" : "none"} />
      </button>
      {showTrailer && <TrailerModal movieId={id} mediaType={mediaType} onClose={() => setShowTrailer(false)} />}
    </div>
  );
}
