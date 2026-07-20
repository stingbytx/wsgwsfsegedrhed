"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Menu, X, Bookmark } from "lucide-react";
import { cn, GENRES } from "@/lib/utils";
import SearchOverlay from "./SearchOverlay";

const NAV_LINKS = [
  { href: "/browse/trending", label: "Trending" },
  { href: "/browse/movies", label: "Movies" },
  { href: "/browse/tv", label: "TV Shows" },
  { href: "/genre", label: "Genres" },
  { href: "/watchlist", label: "My List" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 -bottom-px transition-opacity duration-300",
            scrolled ? "glass-solid opacity-100 shadow-lg" : "opacity-0"
          )}
        />
        <nav
          className={cn(
            "relative mx-auto flex max-w-[1600px] items-center justify-between px-4 transition-[padding] duration-300 sm:px-8",
            scrolled ? "py-2.5" : "py-4"
          )}
        >
          <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold tracking-tight font-display text-white">
            OneVerse
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <div key={l.href} className="relative" onMouseEnter={() => l.label === "Genres" && setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
                <Link
                  href={l.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {l.label}
                </Link>
                {l.label === "Genres" && megaOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-1/2 top-full grid w-[420px] -translate-x-1/2 grid-cols-3 gap-1 rounded-2xl glass p-3 glow-primary"
                  >
                    {GENRES.map((g) => (
                      <Link
                        key={g.id}
                        href={`/genre/${g.id}?name=${encodeURIComponent(g.name)}`}
                        className="rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-full glass px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
            </button>
            <Link
              href="/watchlist"
              className="hidden h-9 w-9 items-center justify-center rounded-full glass text-white/70 hover:text-secondary sm:flex"
            >
              <Bookmark size={16} />
            </Link>
            <button className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="glass-solid mt-2 overflow-hidden lg:hidden">
            <div className="flex flex-col gap-1 p-4">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm hover:bg-white/10">
                  {l.label}
                </Link>
              ))}
              <Link href="/watchlist" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm hover:bg-white/10 sm:hidden">
                Watchlist
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
