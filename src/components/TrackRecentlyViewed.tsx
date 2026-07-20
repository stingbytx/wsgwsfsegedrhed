"use client";

import { useEffect } from "react";
import { useLibrary } from "@/store/useLibrary";

export default function TrackRecentlyViewed(props: {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  vote_average: number;
}) {
  const addRecentlyViewed = useLibrary((s) => s.addRecentlyViewed);
  useEffect(() => {
    addRecentlyViewed(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);
  return null;
}
