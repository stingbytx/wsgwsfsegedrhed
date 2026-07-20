"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, User } from "lucide-react";
import { useLibrary } from "@/store/useLibrary";

export default function ProfilePage() {
  const { watchlist, favorites, recentlyViewed } = useLibrary();
  const [username, setUsername] = useState("Guest");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("streamverse-username");
    if (saved) setUsername(saved);
  }, []);

  const saveUsername = (v: string) => {
    setUsername(v);
    localStorage.setItem("streamverse-username", v);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-8">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-brand text-3xl font-bold glow-primary">
          {username.charAt(0).toUpperCase() || <User />}
        </div>
        <div>
          <input
            value={username}
            onChange={(e) => saveUsername(e.target.value)}
            className="rounded-lg bg-transparent text-2xl font-bold outline-none border-b border-transparent focus:border-white/30"
          />
          <p className="text-sm text-white/40">StreamVerse Member</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl glass p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{watchlist.length}</p>
          <p className="text-xs text-white/50">Watchlist</p>
        </div>
        <div className="rounded-xl glass p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{favorites.length}</p>
          <p className="text-xs text-white/50">Favorites</p>
        </div>
        <div className="rounded-xl glass p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{recentlyViewed.length}</p>
          <p className="text-xs text-white/50">Recently Viewed</p>
        </div>
      </div>

      <div className="mt-10 rounded-xl glass p-5">
        <h3 className="mb-4 font-semibold">Settings</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Theme</span>
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm"
          >
            {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
            {theme === "dark" ? "Dark" : "Light"}
          </button>
        </div>
        <p className="mt-2 text-xs text-white/30">StreamVerse is designed for a premium dark cinematic experience.</p>
      </div>
    </div>
  );
}
