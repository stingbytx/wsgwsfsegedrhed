import { NextRequest, NextResponse } from "next/server";
import { getWatchmodeSources } from "@/lib/watchmode";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") === "tv" ? "tv" : "movie";
  const region = req.nextUrl.searchParams.get("region") || "US";
  if (!id) return NextResponse.json({ sources: [] }, { status: 400 });

  try {
    const sources = await getWatchmodeSources(Number(id), type, region);
    return NextResponse.json({ sources });
  } catch {
    return NextResponse.json({ sources: [] }, { status: 500 });
  }
}
