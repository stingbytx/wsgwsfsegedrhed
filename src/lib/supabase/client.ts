"use client";
// Browser Supabase client — used ONLY for authentication (sign up, login,
// OAuth, password reset). Never used to read/write business data.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
