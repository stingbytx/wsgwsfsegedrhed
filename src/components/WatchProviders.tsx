"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Play, DollarSign, ShoppingCart } from "lucide-react";
import type { WatchmodeSource } from "@/lib/watchmode";
import { IMG } from "@/lib/tmdb";

const TYPE_LABEL: Record<string, string> = {
  sub: "Stream",
  free: "Free",
  rent: "Rent",
  buy: "Buy",
  tve: "TV Provider",
};

const TYPE_ICON: Record<string, any> = {
  sub: Play,
  free: Play,
  rent: DollarSign,
  buy: ShoppingCart,
  tve: Play,
};

export default function WatchProviders({
  id,
  mediaType,
  tmdbProviders,
}: {
  id: number;
  mediaType: "movie" | "tv";
  tmdbProviders?: {
    link: string;
    flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
    rent?: { provider_id: number; provider_name: string; logo_path: string }[];
    buy?: { provider_id: number; provider_name: string; logo_path: string }[];
  };
}) {
  const [sources, setSources] = useState<WatchmodeSource[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/watch-sources?id=${id}&type=${mediaType}`)
      .then((r) => r.json())
      .then((d) => setSources(d.sources || []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [id, mediaType]);

  if (loading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-12 rounded-xl skeleton" />
        ))}
      </div>
    );
  }

  // Prefer Watchmode (has direct deep links); fall back to TMDB providers (logos only, generic link)
  if (sources && sources.length > 0) {
    // De-dupe by source name, prefer 'sub' type first
    const seen = new Set<string>();
    const unique = sources
      .sort((a, b) => (a.type === "sub" ? -1 : 1))
      .filter((s) => {
        const key = `${s.name}-${s.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);

    return (
      <div className="flex flex-wrap gap-3">
        {unique.map((s) => {
          const Icon = TYPE_ICON[s.type] || Play;
          return (
            <a
              key={`${s.source_id}-${s.type}`}
              href={s.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-xl glass px-3 py-2 transition-transform hover:scale-105 hover:glow-primary"
              title={`${TYPE_LABEL[s.type] || "Watch"} on ${s.name}`}
            >
              {s.logo_100px ? (
                <div className="relative h-7 w-7 overflow-hidden rounded-md shrink-0">
                  <Image src={s.logo_100px} alt={s.name} fill className="object-cover" />
                </div>
              ) : (
                <Icon size={16} />
              )}
              <div className="text-left">
                <p className="text-xs font-semibold leading-tight">{s.name}</p>
                <p className="text-[10px] text-white/50 leading-tight">{TYPE_LABEL[s.type] || "Watch"}</p>
              </div>
              <ExternalLink size={12} className="ml-1 text-white/30 group-hover:text-secondary" />
            </a>
          );
        })}
      </div>
    );
  }

  // Fallback: TMDB watch providers (no deep link per-provider, but has a JustWatch link)
  const flat = [...(tmdbProviders?.flatrate || []), ...(tmdbProviders?.rent || []), ...(tmdbProviders?.buy || [])];
  if (flat.length > 0) {
    return (
      <div className="flex flex-wrap gap-3">
        {flat.slice(0, 8).map((p) => (
          <a
            key={p.provider_id}
            href={tmdbProviders?.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-xl glass px-3 py-2 transition-transform hover:scale-105 hover:glow-primary"
            title={`Watch on ${p.provider_name}`}
          >
            <div className="relative h-7 w-7 overflow-hidden rounded-md shrink-0">
              <Image src={IMG.w185(p.logo_path)} alt={p.provider_name} fill className="object-cover" />
            </div>
            <p className="text-xs font-semibold">{p.provider_name}</p>
            <ExternalLink size={12} className="ml-1 text-white/30 group-hover:text-secondary" />
          </a>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-white/40">Not currently available on any streaming platform in your region.</p>;
}
