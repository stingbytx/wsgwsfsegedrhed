"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-white flex">
      {/* Left: Illustration - Same as login page */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-start pl-12">
        <div className="relative w-full h-full flex items-center">
          <Image
            src="/assets/person-illustration.png"
            alt="UniPOS Dashboard"
            width={500}
            height={600}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Right: Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10">
          <div className="w-full max-w-sm">
            {/* Logo - Smaller but still prominent */}
            <div className="flex justify-center mb-6">
              <Image
                src="/assets/unipos-logo.png"
                alt="UniPOS"
                width={180}
                height={50}
                className="h-12 w-auto"
              />
            </div>

            {/* Heading - Centered */}
            <h1 className="text-3xl font-black text-slate-900 mb-2 text-center">Create Account</h1>
            
            {/* Subheading - Centered */}
            <p className="text-sm text-slate-500 mb-8 text-center">Sign up for your UniPOS Account</p>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="storeName" className="text-slate-700">
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
                <Label htmlFor="email" className="text-slate-700">
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
                <Label htmlFor="password" className="text-slate-700">
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
                <Label htmlFor="confirmPassword" className="text-slate-700">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  className="mt-1.5"
                />
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 rounded-full text-base font-semibold" loading={loading}>
                Create Account
              </Button>
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
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-4 border-t border-slate-100">
          © 2026 UniPOS. All rights reserved.
          <br />
          Proudly made in Sri Lanka
        </footer>
      </div>
    </div>
  );
}
