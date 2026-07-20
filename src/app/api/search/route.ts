import { NextRequest, NextResponse } from "next/server";
import { searchMulti } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  try {
    const data = await searchMulti(q);
    const results = (data.results || [])
      .filter((r: any) => r.media_type !== "person" || r.known_for_department)
      .slice(0, 10);
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
