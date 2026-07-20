"use client";

import { useState } from "react";
import { AlertTriangle, ExternalLink, Play } from "lucide-react";

const SERVERS: {
  name: string;
  movieUrl: (id: number) => string;
  tvUrl: (id: number, season: number, episode: number) => string;
}[] = [
  {
    name: "Server 1",
    movieUrl: (id) => `https://vsembed.ru/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vsembed.ru/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "Server 2",
    movieUrl: (id) => `https://vsembed.su/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vsembed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "Server 3",
    movieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    name: "Server 4",
    movieUrl: (id) => `https://player.autoembed.cc/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://player.autoembed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "Server 5",
    movieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    tvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
];

export default function StreamPlayer({
  tmdbId,
  mediaType,
  season = 1,
  episode = 1,
}: {
  tmdbId: number;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
}) {
  const [open, setOpen] = useState(false);
  const [serverIndex, setServerIndex] = useState(0);
  const [ack, setAck] = useState(false);
  const server = SERVERS[serverIndex];
  const url = mediaType === "movie" ? server.movieUrl(tmdbId) : server.tvUrl(tmdbId, season, episode);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full glass px-6 py-3 text-sm font-semibold text-white/80 transition-transform hover:scale-105 hover:text-accent border border-accent/30"
      >
        <Play size={16} fill="currentColor" /> Alternate Sources
      </button>
    );
  }

  if (!ack) {
    return (
      <div className="rounded-2xl glass p-5 border border-warning/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={20} />
          <div>
            <p className="text-sm font-semibold text-warning">Third-party content notice</p>
            <p className="mt-1 text-xs text-white/60">
              These "Alternate Sources" load video from third-party sites that are not affiliated with, licensed by,
              or verified by this app. Availability, legality, and content quality are entirely outside our control.
              For personal use only.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setAck(true)}
                className="rounded-full gradient-brand px-4 py-2 text-xs font-semibold"
              >
                I understand, continue
              </button>
              <button onClick={() => setOpen(false)} className="rounded-full glass px-4 py-2 text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass overflow-hidden border border-accent/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 p-3">
        <div className="flex flex-wrap gap-1.5">
          {SERVERS.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setServerIndex(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === serverIndex ? "gradient-brand" : "glass text-white/60 hover:text-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs text-white/60 hover:text-secondary"
          >
            <ExternalLink size={12} /> Open in tab
          </a>
          <button onClick={() => setOpen(false)} className="rounded-full glass px-3 py-1.5 text-xs text-white/60 hover:text-white">
            Close
          </button>
        </div>
      </div>
      <div className="relative aspect-video w-full bg-black">
        <iframe
          key={url}
          src={url}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
