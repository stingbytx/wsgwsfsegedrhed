"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Star, Bookmark, Heart } from "lucide-react";
import { IMG } from "@/lib/tmdb";
import { titleOf, yearOf, mediaTypeOf, cn } from "@/lib/utils";
import type { MediaBase } from "@/types/tmdb";
import { useLibrary } from "@/store/useLibrary";

export default function MediaCard({
  item,
  mediaType,
  priority = false,
}: {
  item: MediaBase;
  mediaType?: "movie" | "tv";
  priority?: boolean;
}) {
  if (item.media_type === "person") return null;
  const type = mediaTypeOf(item, mediaType);
  const { toggleWatchlist, toggleFavorite, isInWatchlist, isInFavorites } = useLibrary();
  const inWatchlist = isInWatchlist(item.id, type);
  const inFavorites = isInFavorites(item.id, type);

  return (
    <motion.div
      className="group relative w-[160px] sm:w-[190px] md:w-[210px] shrink-0"
      whileHover={{ scale: 1.08, zIndex: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <Link href={`/${type}/${item.id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl glass shadow-lg group-hover:glow-primary transition-shadow duration-300">
          {item.poster_path ? (
            <Image
              src={IMG.w500(item.poster_path)}
              alt={titleOf(item)}
              fill
              priority={priority}
              sizes="210px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5 text-xs text-white/40">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-x-0 bottom-0 p-2.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <p className="text-xs font-semibold line-clamp-1">{titleOf(item)}</p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-white/70">
              <span className="flex items-center gap-0.5 text-warning">
                <Star size={10} fill="currentColor" /> {item.vote_average?.toFixed(1)}
              </span>
              <span>{yearOf(item)}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-brand text-white">
                <Play size={11} fill="currentColor" />
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite({ id: item.id, media_type: type, title: titleOf(item), poster_path: item.poster_path, vote_average: item.vote_average });
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full glass",
                  inFavorites && "text-accent"
                )}
              >
                <Heart size={11} fill={inFavorites ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleWatchlist({ id: item.id, media_type: type, title: titleOf(item), poster_path: item.poster_path, vote_average: item.vote_average });
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full glass",
                  inWatchlist && "text-secondary"
                )}
              >
                <Bookmark size={11} fill={inWatchlist ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
