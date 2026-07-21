"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    router.push("/dashboard");
    router.refresh();
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main content area - full height */}
      <div className="flex-1 flex justify-between items-center">
        {/* LEFT SIDE - 55% - Illustration with watercolor background */}
        <div className="hidden lg:flex w-[55%] h-full relative items-center justify-center overflow-hidden">
          {/* Blue watercolor background - subtle, 70% opacity */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.3), transparent 50%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.25), transparent 60%)",
            }}
          />
          {/* Illustration - centered, object-fit contain */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <Image
              src="/assets/person-illustration.png"
              alt="UniPOS Dashboard"
              width={600}
              height={700}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* RIGHT SIDE - 45% - Login Form */}
        <div className="w-full lg:w-[45%] flex items-center justify-center px-6 sm:px-10 md:px-0 md:pr-12">
          <div style={{ width: "420px", maxWidth: "460px" }}>
            {/* LOGO - Centered, 10px margin bottom */}
            <div className="flex justify-center mb-[10px]">
              <Image
                src="/assets/unipos-logo.png"
                alt="UniPOS"
                width={140}
                height={40}
                className="h-10 w-auto"
              />
            </div>

            {/* HEADING - Welcome Back, 42px, weight 700, color #111827 */}
            <h1 className="text-[42px] font-bold text-[#111827] text-center mb-2">Welcome Back</h1>

            {/* SUBTITLE - 16px, color #6B7280, 40px spacing below */}
            <p className="text-[16px] text-[#6B7280] text-center mb-10">Sign in to your UniPOS Account</p>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* EMAIL FIELD */}
              <div>
                <Label
                  htmlFor="email"
                  className="text-[15px] font-[600] text-[#1F2937] mb-[10px] block"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  {...register("email")}
                  className="h-14 rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:border-[#0070E0] focus:ring-[3px] focus:ring-[rgba(0,112,224,0.12)] focus:outline-none transition-all"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              {/* PASSWORD FIELD */}
              <div>
                <div className="flex items-center justify-between mb-[10px]">
                  <Label htmlFor="password" className="text-[15px] font-[600] text-[#1F2937]">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-[14px] text-[#0070E0] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="h-14 rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:border-[#0070E0] focus:ring-[3px] focus:ring-[rgba(0,112,224,0.12)] focus:outline-none transition-all"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              {/* SIGN IN BUTTON - Gradient, 54px height, rounded 999px */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] rounded-[999px] bg-gradient-to-b from-[#0070E0] to-[#0052CC] text-white font-bold text-[16px] hover:from-[#0060cc] hover:to-[#004ab3] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* DIVIDER - OR */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px bg-[#E5E7EB] flex-1" />
              <span className="text-xs text-[#6B7280]">OR</span>
              <div className="h-px bg-[#E5E7EB] flex-1" />
            </div>

            {/* GOOGLE BUTTON - White bg, border #E5E7EB, 54px height, rounded 999px */}
            <button
              type="button"
              onClick={onGoogle}
              disabled={googleLoading}
              className="w-full h-[54px] rounded-[999px] bg-white border border-[#E5E7EB] text-[#1F2937] font-bold text-[16px] hover:bg-[#f9fafb] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex items-center justify-center gap-2"
            >
              {googleLoading ? (
                "Signing in..."
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* BOTTOM TEXT - Centered, signup link blue */}
            <p className="text-center text-[16px] text-[#6B7280] mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#0070E0] font-bold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER - Centered at bottom */}
      <footer className="text-center text-xs text-[#6B7280] py-6 px-4 border-t border-[#E5E7EB] bg-white">
        © 2026 UniPOS. All rights reserved.
        <br />
        Proudly made in Sri Lanka
      </footer>
    </div>
  );
}
