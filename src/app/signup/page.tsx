"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

const schema = z
  .object({
    storeName: z.string().min(2, "Store name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { store_name: values.storeName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/verify-email");
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

        {/* RIGHT - 50% - Signup Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-md">
            {/* Logo - Reduced by 5% */}
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/unipos-logo.png"
                alt="UniPOS"
                width={152}
                height={47}
                className="h-11 w-auto"
              />
            </div>

            {/* Heading - Same size as login page */}
            <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">Create Account</h1>

            {/* Subheading - Same size as login page */}
            <p className="text-sm text-slate-500 text-center mb-8">Sign up for your UniPOS Account</p>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="storeName" className="text-slate-700 font-semibold">
                  Store Name
                </Label>
                <Input
                  id="storeName"
                  placeholder="My Shop"
                  {...register("storeName")}
                  className="mt-1.5"
                />
                {errors.storeName && <p className="text-xs text-red-500 mt-1">{errors.storeName.message}</p>}
              </div>

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
                <Label htmlFor="password" className="text-slate-700 font-semibold">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="mt-1.5"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="mt-1.5"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-gradient-to-b from-[#0070E0] to-[#0052CC] text-white font-semibold text-base hover:from-[#0060cc] hover:to-[#004ab3] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400">OR</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Sign In Link */}
            <p className="text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#0070E0] font-semibold hover:underline">
                Sign in
              </Link>
            </p>

            {/* Copyright - One Line - 20px down */}
            <p className="text-center text-xs text-slate-500 mt-12">
              © 2026 UniPOS. All rights reserved. Proudly made in Sri Lanka
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
