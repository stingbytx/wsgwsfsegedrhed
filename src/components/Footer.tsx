import Link from "next/link";
import { Globe, Send, Camera } from "lucide-react";
import { GENRES } from "@/lib/utils";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/40">
      <div className="mx-auto max-w-[1600px] px-4 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-xl font-extrabold font-display text-white">
              OneVerse
            </Link>
            <p className="mt-3 max-w-xs text-sm text-white/50">
              The most premium cinematic streaming discovery experience. Powered by TMDB.
            </p>
            <div className="mt-4 flex gap-3">
              {[Globe, Send, Camera].map((Icon, i) => (
                <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full glass text-white/60 hover:text-secondary transition-colors">
                  <Icon size={16} />
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white/80">Browse</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link href="/browse/trending" className="hover:text-secondary">Trending</Link></li>
              <li><Link href="/browse/movies" className="hover:text-secondary">Movies</Link></li>
              <li><Link href="/browse/tv" className="hover:text-secondary">TV Shows</Link></li>
              <li><Link href="/browse/upcoming" className="hover:text-secondary">Upcoming</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white/80">Genres</h4>
            <ul className="space-y-2 text-sm text-white/50">
              {GENRES.slice(0, 4).map((g) => (
                <li key={g.id}><Link href={`/genre/${g.id}?name=${g.name}`} className="hover:text-secondary">{g.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white/80">Company</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link href="/watchlist" className="hover:text-secondary">Watchlist</Link></li>
              <li><Link href="/about" className="hover:text-secondary">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-secondary">Contact Us</Link></li>
              <li><Link href="/terms" className="hover:text-secondary">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>© 2026 OneVerse. A Subsidiary Of DotcomOne</p>
          <p>Built with Next.js, Tailwind & Framer Motion.</p>
        </div>
      </div>
    </footer>
  );
}
