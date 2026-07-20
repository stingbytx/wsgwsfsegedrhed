import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Camera, Send, Globe } from "lucide-react";
import { getPersonDetails, IMG } from "@/lib/tmdb";
import { formatDate } from "@/lib/utils";
import MediaRow from "@/components/MediaRow";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await getPersonDetails(id);
    return { title: p.name, description: p.biography?.slice(0, 160) };
  } catch {
    return { title: "Person" };
  }
}

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  let person;
  try {
    person = await getPersonDetails(id);
  } catch {
    return notFound();
  }

  const credits = (person.combined_credits?.cast || [])
    .filter((c) => c.poster_path)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-8">
      <div className="flex flex-col gap-8 sm:flex-row">
        <div className="mx-auto w-52 shrink-0 overflow-hidden rounded-2xl glass shadow-2xl sm:mx-0">
          <div className="relative aspect-[2/3]">
            {person.profile_path && <Image src={IMG.w500(person.profile_path)} alt={person.name} fill className="object-cover" />}
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl font-display">{person.name}</h1>
          <p className="mt-1 text-sm text-white/50">{person.known_for_department}</p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl glass p-3">
              <p className="text-[11px] uppercase text-white/40">Birthday</p>
              <p className="text-sm font-semibold">{formatDate(person.birthday || undefined)}</p>
            </div>
            <div className="rounded-xl glass p-3">
              <p className="text-[11px] uppercase text-white/40">Place of Birth</p>
              <p className="text-sm font-semibold">{person.place_of_birth || "—"}</p>
            </div>
            <div className="rounded-xl glass p-3">
              <p className="text-[11px] uppercase text-white/40">Popularity</p>
              <p className="text-sm font-semibold">{person.popularity?.toFixed(0)}</p>
            </div>
          </div>

          {person.biography && (
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-bold">Biography</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/70 line-clamp-[12]">{person.biography}</p>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            {person.external_ids?.instagram_id && (
              <a href={`https://instagram.com/${person.external_ids.instagram_id}`} target="_blank" className="flex h-9 w-9 items-center justify-center rounded-full glass hover:text-secondary">
                <Camera size={16} />
              </a>
            )}
            {person.external_ids?.twitter_id && (
              <a href={`https://twitter.com/${person.external_ids.twitter_id}`} target="_blank" className="flex h-9 w-9 items-center justify-center rounded-full glass hover:text-secondary">
                <Send size={16} />
              </a>
            )}
            {person.external_ids?.facebook_id && (
              <a href={`https://facebook.com/${person.external_ids.facebook_id}`} target="_blank" className="flex h-9 w-9 items-center justify-center rounded-full glass hover:text-secondary">
                <Globe size={16} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <MediaRow title="Known For / Filmography" items={credits as any} />
      </div>
    </div>
  );
}
