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
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* LEFT - 50% - Illustration fills entire left side */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center overflow-hidden bg-white">
          <Image
            src="/assets/person-illustration.png"
            alt="UniPOS Dashboard"
            width={800}
            height={1000}
            className="w-full h-full object-cover"
            priority
          />
        </div>

        {/* RIGHT - 50% - Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-md">
            {/* Logo - Centered */}
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/unipos-logo.png"
                alt="UniPOS"
                width={160}
                height={50}
                className="h-12 w-auto"
              />
            </div>

            {/* Heading - Centered */}
            <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">Welcome Back</h1>

            {/* Subheading - Centered */}
            <p className="text-sm text-slate-500 text-center mb-8">Sign in to your UniPOS Account</p>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-slate-700 font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  {...register("email")}
                  className="mt-1.5"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="text-slate-700 font-semibold">
                    Password
                  </Label>
                  <Link href="/forgot-password" className="text-xs text-[#0070E0] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 rounded-full text-base font-semibold" loading={loading}>
                Sign in
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">OR</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Google Login */}
            <Button
              variant="outline"
              className="w-full h-11 rounded-full text-base font-semibold"
              onClick={onGoogle}
              loading={googleLoading}
            >
              Continue with Google
            </Button>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-slate-600 mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#0070E0] font-semibold hover:underline">
                Sign up
              </Link>
            </p>

            {/* Copyright - One Line */}
            <p className="text-center text-xs text-slate-500 mt-8">
              © 2026 UniPOS. All rights reserved. Proudly made in Sri Lanka
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
