"use client";

import Image from "next/image";
import Link from "next/link";
import { IMG } from "@/lib/tmdb";
import type { CastMember } from "@/types/tmdb";

export default function CastCarousel({ cast }: { cast: CastMember[] }) {
  if (!cast?.length) return null;
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
      {cast.slice(0, 20).map((c) => (
        <Link key={c.id} href={`/person/${c.id}`} className="w-28 shrink-0 text-center group">
          <div className="relative aspect-square overflow-hidden rounded-full glass mb-2 mx-auto w-24 h-24 group-hover:glow-primary transition-shadow">
            {c.profile_path ? (
              <Image src={IMG.profile(c.profile_path)} alt={c.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-white/30">No Photo</div>
            )}
          </div>
          <p className="text-xs font-medium line-clamp-1">{c.name}</p>
          <p className="text-[11px] text-white/50 line-clamp-1">{c.character}</p>
        </Link>
      ))}
    </div>
  );
}
