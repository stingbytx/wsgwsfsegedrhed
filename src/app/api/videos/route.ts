import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  if (!id) return NextResponse.json({ key: null }, { status: 400 });

  try {
    const data = type === "tv" ? await getTvDetails(id) : await getMovieDetails(id);
    const videos = data.videos?.results || [];
    const trailer =
      videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
      videos.find((v: any) => v.site === "YouTube" && v.type === "Trailer") ||
      videos.find((v: any) => v.site === "YouTube");
    return NextResponse.json({ key: trailer?.key || null });
  } catch (e) {
    return NextResponse.json({ key: null }, { status: 500 });
  }
}
