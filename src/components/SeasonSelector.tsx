"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Clock } from "lucide-react";
import { IMG } from "@/lib/tmdb";
import { formatDate } from "@/lib/utils";
import type { Season } from "@/types/tmdb";

export default function SeasonSelector({ tvId, seasons }: { tvId: number; seasons: Season[] }) {
  const valid = seasons.filter((s) => s.season_number > 0);
  const [selected, setSelected] = useState(valid[0]?.season_number ?? 1);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/season?tv=${tvId}&season=${selected}`)
      .then((r) => r.json())
      .then((d) => setEpisodes(d.episodes || []))
      .finally(() => setLoading(false));
  }, [tvId, selected]);

  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {valid.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.season_number)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selected === s.season_number ? "gradient-brand text-white" : "glass text-white/60 hover:text-white"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 w-full rounded-xl skeleton" />)}
        {!loading &&
          episodes.map((ep) => (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex gap-4 rounded-xl glass p-3 hover:glow-primary transition-shadow"
            >
              <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {ep.still_path && <Image src={IMG.w342(ep.still_path)} alt={ep.name} fill className="object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {ep.episode_number}. {ep.name}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-white/50">
                  <span className="flex items-center gap-1 text-warning">
                    <Star size={10} fill="currentColor" /> {ep.vote_average?.toFixed(1)}
                  </span>
                  {ep.runtime && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> {ep.runtime}m
                    </span>
                  )}
                  <span>{formatDate(ep.air_date)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-white/50">{ep.overview}</p>
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
