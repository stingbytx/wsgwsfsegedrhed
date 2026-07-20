import { NextRequest, NextResponse } from "next/server";
import { getTvSeason } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const tv = req.nextUrl.searchParams.get("tv");
  const season = req.nextUrl.searchParams.get("season");
  if (!tv || !season) return NextResponse.json({ episodes: [] }, { status: 400 });
  try {
    const data = await getTvSeason(tv, Number(season));
    return NextResponse.json({ episodes: data.episodes || [] });
  } catch {
    return NextResponse.json({ episodes: [] }, { status: 500 });
  }
}
