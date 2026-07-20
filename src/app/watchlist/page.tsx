"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { IMG } from "@/lib/tmdb";
import { useLibrary } from "@/store/useLibrary";

const TABS = [
  { key: "watchlist", label: "Watchlist" },
  { key: "favorites", label: "Favorites" },
  { key: "recentlyViewed", label: "Recently Viewed" },
] as const;

export default function WatchlistPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("watchlist");
  const state = useLibrary();
  const items = state[tab];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">
        My <span className="gradient-text">Library</span>
      </h1>
      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              tab === t.key ? "gradient-brand" : "glass text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 text-white/40">Nothing here yet. Start exploring and add titles!</p>
      ) : (
        <div className="mt-8 flex flex-wrap gap-4">
          {items.map((item) => (
            <div key={`${item.media_type}-${item.id}`} className="group relative w-[160px] sm:w-[190px]">
              <Link href={`/${item.media_type}/${item.id}`}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl glass">
                  {item.poster_path && <Image src={IMG.w500(item.poster_path)} alt={item.title} fill className="object-cover transition-transform group-hover:scale-105" />}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
              </Link>
              {tab !== "recentlyViewed" && (
                <button
                  onClick={() => (tab === "watchlist" ? state.toggleWatchlist(item) : state.toggleFavorite(item))}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-accent"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
