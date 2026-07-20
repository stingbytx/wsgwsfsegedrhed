"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function TrailerModal({
  movieId,
  mediaType,
  videoKey,
  onClose,
}: {
  movieId?: number;
  mediaType?: "movie" | "tv";
  videoKey?: string;
  onClose: () => void;
}) {
  const [key, setKey] = useState<string | null>(videoKey || null);
  const [loading, setLoading] = useState(!videoKey);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    if (videoKey || !movieId || !mediaType) return;
    fetch(`/api/videos?id=${movieId}&type=${mediaType}`)
      .then((r) => r.json())
      .then((d) => setKey(d.key || null))
      .finally(() => setLoading(false));
  }, [movieId, mediaType, videoKey]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 22 }}
          className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl glass glow-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
          >
            <X size={18} />
          </button>
          {loading ? (
            <div className="flex h-full w-full items-center justify-center skeleton" />
          ) : key ? (
            <iframe
              src={`https://www.youtube.com/embed/${key}?autoplay=1&rel=0`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/60">No trailer available</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
