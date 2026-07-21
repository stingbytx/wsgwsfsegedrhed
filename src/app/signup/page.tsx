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

        {/* RIGHT SIDE - 45% - Signup Form */}
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

            {/* HEADING - Create Account, 42px, weight 700, color #111827 */}
            <h1 className="text-[42px] font-bold text-[#111827] text-center mb-2">Create Account</h1>

            {/* SUBTITLE - 16px, color #6B7280, 40px spacing below */}
            <p className="text-[16px] text-[#6B7280] text-center mb-10">Sign up for your UniPOS Account</p>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* STORE NAME FIELD */}
              <div>
                <Label
                  htmlFor="storeName"
                  className="text-[15px] font-[600] text-[#1F2937] mb-[10px] block"
                >
                  Store Name
                </Label>
                <Input
                  id="storeName"
                  placeholder="My Shop"
                  {...register("storeName")}
                  className="h-14 rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:border-[#0070E0] focus:ring-[3px] focus:ring-[rgba(0,112,224,0.12)] focus:outline-none transition-all"
                />
                {errors.storeName && <p className="text-xs text-red-500 mt-1">{errors.storeName.message}</p>}
              </div>

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
                <Label htmlFor="password" className="text-[15px] font-[600] text-[#1F2937] mb-[10px] block">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="h-14 rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:border-[#0070E0] focus:ring-[3px] focus:ring-[rgba(0,112,224,0.12)] focus:outline-none transition-all"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              {/* CONFIRM PASSWORD FIELD */}
              <div>
                <Label
                  htmlFor="confirmPassword"
                  className="text-[15px] font-[600] text-[#1F2937] mb-[10px] block"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="h-14 rounded-[14px] border border-[#E5E7EB] bg-white px-4 text-slate-800 placeholder:text-slate-400 focus:border-[#0070E0] focus:ring-[3px] focus:ring-[rgba(0,112,224,0.12)] focus:outline-none transition-all"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* CREATE ACCOUNT BUTTON - Gradient, 54px height, rounded 999px */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[54px] rounded-[999px] bg-gradient-to-b from-[#0070E0] to-[#0052CC] text-white font-bold text-[16px] hover:from-[#0060cc] hover:to-[#004ab3] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            {/* DIVIDER - OR */}
            <div className="flex items-center gap-3 my-6">
              <div className="h-px bg-[#E5E7EB] flex-1" />
              <span className="text-xs text-[#6B7280]">OR</span>
              <div className="h-px bg-[#E5E7EB] flex-1" />
            </div>

            {/* BOTTOM TEXT - Centered, signin link blue */}
            <p className="text-center text-[16px] text-[#6B7280]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#0070E0] font-bold hover:underline">
                Sign in
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
