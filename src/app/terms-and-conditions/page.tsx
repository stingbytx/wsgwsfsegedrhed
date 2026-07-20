import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "UniPOS Terms & Conditions | Subscription Policy & User Agreement",
  description:
    "Read the UniPOS Terms & Conditions including subscription rules, account sharing policy, no refund policy, device restrictions, and acceptable use.",
  keywords: [
    "UniPOS terms",
    "POS software terms",
    "no refund policy",
    "subscription agreement",
    "account sharing policy",
    "device login policy",
    "user agreement",
  ],
  alternates: { canonical: "/terms-and-conditions" },
  openGraph: {
    title: "UniPOS Terms & Conditions | Subscription Policy & User Agreement",
    description:
      "Read the UniPOS Terms & Conditions including subscription rules, account sharing policy, no refund policy, device restrictions, and acceptable use.",
    url: "/terms-and-conditions",
  },
};

export default function TermsPage() {
  return (
    <MarketingPageShell title="Terms & Conditions">
      <p>By creating an account or using UniPOS, you agree to the following terms and conditions.</p>

      <h2>1. Account Responsibility</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials. You must not share your
        username or password with any other person.
      </p>

      <h2>2. Account Sharing</h2>
      <p>
        Sharing your account with others is strictly prohibited. If we detect that your account has been shared,
        accessed by unauthorized users, or used in violation of these terms, your account may be suspended or
        permanently terminated without prior notice.
      </p>

      <h2>3. Multiple Device Login</h2>
      <p>
        Each subscription is intended for a single authorized user unless your subscription specifically includes
        additional users or devices. Logging into your account simultaneously from multiple unauthorized devices may
        result in temporary suspension or permanent termination of your account.
      </p>

      <h2>4. Subscription Fees</h2>
      <p>All subscription fees must be paid in advance according to your selected billing plan.</p>

      <h2>5. No Refund Policy</h2>
      <p>
        All payments made to UniPOS are <strong>final and non-refundable</strong>. We do not provide refunds, partial
        refunds, or credits for unused subscription periods, account suspensions resulting from policy violations, or
        accidental purchases.
      </p>

      <h2>6. Service Availability</h2>
      <p>
        While we strive to provide uninterrupted service, UniPOS does not guarantee continuous availability.
        Scheduled maintenance, updates, or unforeseen technical issues may occasionally affect access.
      </p>

      <h2>7. Acceptable Use</h2>
      <p>
        Users must not misuse, reverse engineer, copy, exploit, or attempt to interfere with the UniPOS platform or
        its services.
      </p>

      <h2>8. Changes to Terms</h2>
      <p>
        UniPOS reserves the right to modify these Terms &amp; Conditions at any time. Continued use of the platform
        constitutes acceptance of the updated terms.
      </p>

      <p>
        By using UniPOS, you acknowledge that you have read, understood, and agreed to these Terms &amp; Conditions.
      </p>
    </MarketingPageShell>
  );
}
