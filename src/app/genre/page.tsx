import Link from "next/link";
import { GENRES } from "@/lib/utils";

export default function GenresIndexPage() {
  const gradients = [
    "from-[#6C63FF] to-[#00D4FF]",
    "from-[#FF3D71] to-[#6C63FF]",
    "from-[#00D4FF] to-[#00E676]",
    "from-[#FFC107] to-[#FF3D71]",
  ];
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8">
      <h1 className="text-2xl font-bold sm:text-3xl">
        Browse by <span className="gradient-text">Genre</span>
      </h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {GENRES.map((g, i) => (
          <Link
            key={g.id}
            href={`/genre/${g.id}?name=${encodeURIComponent(g.name)}`}
            className={`flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} bg-opacity-20 glass text-lg font-bold transition-transform hover:scale-105`}
          >
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
