"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";
import type { MediaBase } from "@/types/tmdb";

export default function MediaRow({
  title,
  items,
  mediaType,
  seeAllHref,
}: {
  title: string;
  items: MediaBase[];
  mediaType?: "movie" | "tv";
  seeAllHref?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!items?.length) return null;

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 700, behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="relative py-3"
    >
      <div className="mb-3 flex items-center justify-between px-4 sm:px-8">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
        {seeAllHref && (
          <a href={seeAllHref} className="text-xs sm:text-sm text-white/50 hover:text-secondary transition-colors">
            See all →
          </a>
        )}
      </div>
      <div className="group/row relative">
        <button
          aria-label="scroll left"
          onClick={() => scroll(-1)}
          className="absolute left-1 top-0 bottom-0 z-10 hidden w-10 items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 transition-opacity group-hover/row:opacity-100 sm:flex"
        >
          <ChevronLeft />
        </button>
        <div
          ref={ref}
          className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth px-4 sm:px-8 pb-4"
        >
          {items.map((item, i) => (
            <MediaCard key={`${item.id}-${i}`} item={item} mediaType={mediaType} priority={i < 4} />
          ))}
        </div>
        <button
          aria-label="scroll right"
          onClick={() => scroll(1)}
          className="absolute right-1 top-0 bottom-0 z-10 hidden w-10 items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 transition-opacity group-hover/row:opacity-100 sm:flex"
        >
          <ChevronRight />
        </button>
      </div>
    </motion.section>
  );
}
