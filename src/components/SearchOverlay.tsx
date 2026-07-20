"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Star } from "lucide-react";
import { IMG } from "@/lib/tmdb";
import { titleOf, yearOf } from "@/lib/utils";

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    else {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.results || []))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const go = (item: any) => {
    onClose();
    if (item.media_type === "person") router.push(`/person/${item.id}`);
    else router.push(`/${item.media_type}/${item.id}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-md p-4 pt-24"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -30, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 24 }}
            className="w-full max-w-2xl rounded-2xl glass glow-primary overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <Search size={20} className="text-secondary" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && onClose()}
                placeholder="Search movies, TV shows, actors..."
                className="w-full bg-transparent text-lg outline-none placeholder:text-white/40"
              />
              <button onClick={onClose} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading && <div className="p-6 text-center text-white/40 text-sm">Searching…</div>}
              {!loading && q && results.length === 0 && (
                <div className="p-6 text-center text-white/40 text-sm">No results for "{q}"</div>
              )}
              {results.map((item) => (
                <button
                  key={`${item.media_type}-${item.id}`}
                  onClick={() => go(item)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
                    {(item.poster_path || item.profile_path) && (
                      <Image
                        src={IMG.w185(item.poster_path || item.profile_path)}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{titleOf(item) || item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span className="capitalize">{item.media_type}</span>
                      {item.media_type !== "person" && (
                        <>
                          <span>•</span>
                          <span>{yearOf(item)}</span>
                          <span className="flex items-center gap-0.5 text-warning">
                            <Star size={10} fill="currentColor" /> {item.vote_average?.toFixed(1)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
