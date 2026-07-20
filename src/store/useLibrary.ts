"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LibraryItem {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  vote_average: number;
  addedAt: number;
}

interface LibraryState {
  watchlist: LibraryItem[];
  favorites: LibraryItem[];
  recentlyViewed: LibraryItem[];
  continueWatching: LibraryItem[];
  toggleWatchlist: (item: Omit<LibraryItem, "addedAt">) => void;
  toggleFavorite: (item: Omit<LibraryItem, "addedAt">) => void;
  addRecentlyViewed: (item: Omit<LibraryItem, "addedAt">) => void;
  isInWatchlist: (id: number, media_type: string) => boolean;
  isInFavorites: (id: number, media_type: string) => boolean;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      favorites: [],
      recentlyViewed: [],
      continueWatching: [],
      toggleWatchlist: (item) =>
        set((state) => {
          const exists = state.watchlist.find(
            (i) => i.id === item.id && i.media_type === item.media_type
          );
          if (exists) {
            return {
              watchlist: state.watchlist.filter(
                (i) => !(i.id === item.id && i.media_type === item.media_type)
              ),
            };
          }
          return { watchlist: [{ ...item, addedAt: Date.now() }, ...state.watchlist] };
        }),
      toggleFavorite: (item) =>
        set((state) => {
          const exists = state.favorites.find(
            (i) => i.id === item.id && i.media_type === item.media_type
          );
          if (exists) {
            return {
              favorites: state.favorites.filter(
                (i) => !(i.id === item.id && i.media_type === item.media_type)
              ),
            };
          }
          return { favorites: [{ ...item, addedAt: Date.now() }, ...state.favorites] };
        }),
      addRecentlyViewed: (item) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter(
            (i) => !(i.id === item.id && i.media_type === item.media_type)
          );
          return { recentlyViewed: [{ ...item, addedAt: Date.now() }, ...filtered].slice(0, 24) };
        }),
      isInWatchlist: (id, media_type) =>
        !!get().watchlist.find((i) => i.id === id && i.media_type === media_type),
      isInFavorites: (id, media_type) =>
        !!get().favorites.find((i) => i.id === id && i.media_type === media_type),
    }),
    { name: "streamverse-library" }
  )
);
