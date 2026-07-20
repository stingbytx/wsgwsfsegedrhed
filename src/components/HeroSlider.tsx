"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Info, Plus, Check, Star } from "lucide-react";
import { IMG } from "@/lib/tmdb";
import { titleOf, yearOf, formatRuntime, cn } from "@/lib/utils";
import type { MediaBase } from "@/types/tmdb";
import { useLibrary } from "@/store/useLibrary";
import TrailerModal from "./TrailerModal";

export default function HeroSlider({ items }: { items: (MediaBase & { runtime?: number; genreNames?: string[] })[] }) {
  const [index, setIndex] = useState(0);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const { toggleWatchlist, isInWatchlist } = useLibrary();

  const next = useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);

  useEffect(() => {
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next]);

  if (!items?.length) return null;
  const item = items[index];
  const type = (item.media_type as "movie" | "tv") || "movie";
  const inWatchlist = isInWatchlist(item.id, type);

  return (
    <div className="relative h-[70vh] min-h-[520px] w-full overflow-hidden sm:h-[88vh]">
      <AnimatePresence mode="sync">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <Image
            src={IMG.original(item.backdrop_path)}
            alt={titleOf(item)}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/20 to-transparent" />
          <div className="absolute inset-0 [background:radial-gradient(ellipse_at_top_right,rgba(108,99,255,0.25),transparent_60%)]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-4 pb-16 sm:px-8 sm:pb-24 max-w-3xl">
        <motion.div
          key={`content-${item.id}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-lg sm:text-6xl font-display">
            {titleOf(item)}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-white/80">
            <span className="flex items-center gap-1 rounded-full glass px-2.5 py-1 text-warning">
              <Star size={13} fill="currentColor" /> {item.vote_average?.toFixed(1)}
            </span>
            <span className="rounded-full glass px-2.5 py-1">{yearOf(item)}</span>
            {item.runtime ? <span className="rounded-full glass px-2.5 py-1">{formatRuntime(item.runtime)}</span> : null}
            {item.genreNames?.slice(0, 3).map((g) => (
              <span key={g} className="rounded-full glass px-2.5 py-1">
                {g}
              </span>
            ))}
          </div>
          <p className="mt-4 line-clamp-3 max-w-xl text-sm text-white/70 sm:text-base">{item.overview}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setTrailerKey("__auto__")}
              className="flex items-center gap-2 rounded-full gradient-brand px-6 py-3 text-sm font-semibold text-white glow-primary transition-transform hover:scale-105"
            >
              <Play size={16} fill="currentColor" /> Watch Trailer
            </button>
            <Link
              href={`/${type}/${item.id}`}
              className="flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold transition-transform hover:scale-105"
            >
              <Info size={16} /> More Info
            </Link>
            <button
              onClick={() =>
                toggleWatchlist({
                  id: item.id,
                  media_type: type,
                  title: titleOf(item),
                  poster_path: item.poster_path,
                  vote_average: item.vote_average,
                })
              }
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full glass transition-transform hover:scale-110",
                inWatchlist && "text-secondary"
              )}
              aria-label="Add to watchlist"
            >
              {inWatchlist ? <Check size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-8 gradient-brand" : "w-3 bg-white/30"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {trailerKey && (
        <TrailerModal
          movieId={item.id}
          mediaType={type}
          onClose={() => setTrailerKey(null)}
        />
      )}
    </div>
  );
}
