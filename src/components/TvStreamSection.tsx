"use client";

import { useState } from "react";
import StreamPlayer from "./StreamPlayer";
import type { Season } from "@/types/tmdb";

export default function TvStreamSection({ tvId, seasons }: { tvId: number; seasons: Season[] }) {
  const valid = seasons.filter((s) => s.season_number > 0);
  const [season, setSeason] = useState(valid[0]?.season_number ?? 1);
  const [episode, setEpisode] = useState(1);
  const currentSeason = valid.find((s) => s.season_number === season);
  const episodeCount = currentSeason?.episode_count ?? 20;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          value={season}
          onChange={(e) => {
            setSeason(Number(e.target.value));
            setEpisode(1);
          }}
          className="rounded-lg glass px-3 py-2 text-sm outline-none"
        >
          {valid.map((s) => (
            <option key={s.id} value={s.season_number} className="bg-[#0a0a0a]">
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={episode}
          onChange={(e) => setEpisode(Number(e.target.value))}
          className="rounded-lg glass px-3 py-2 text-sm outline-none"
        >
          {Array.from({ length: episodeCount }).map((_, i) => (
            <option key={i} value={i + 1} className="bg-[#0a0a0a]">
              Episode {i + 1}
            </option>
          ))}
        </select>
      </div>
      <StreamPlayer tmdbId={tvId} mediaType="tv" season={season} episode={episode} />
    </div>
  );
}
