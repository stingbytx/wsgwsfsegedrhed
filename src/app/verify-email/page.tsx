import { Card } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#009CDE]/10 flex items-center justify-center">
          <MailCheck className="h-7 w-7 text-[#009CDE]" />
        </div>
        <h1 className="text-xl font-semibold text-slate-800">Check your inbox</h1>
        <p className="text-sm text-slate-500 mt-2">
          We&apos;ve sent a verification link to your email. Click it to activate your account, then come back and sign in.
        </p>
        <Link href="/login" className="inline-block mt-6 text-[#0070E0] font-medium hover:underline text-sm">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}
