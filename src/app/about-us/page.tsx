import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "About UniPOS - Modern POS Software",
  description:
    "Learn about UniPOS, a modern cloud-based POS system and subsidiary of DotcomOne. We help businesses manage sales, inventory, customers, billing, and reporting with ease.",
  keywords: [
    "UniPOS",
    "POS software",
    "cloud POS",
    "point of sale system",
    "inventory management",
    "billing software",
    "retail POS",
    "restaurant POS",
    "supermarket POS",
    "pharmacy POS",
    "business management software",
    "Sri Lanka POS",
    "DotcomOne",
    "srilankan",
    "madeinsrilanka",
    "srilankanpos",
    "lkpos",
  ],
  alternates: { canonical: "/about-us" },
  openGraph: {
    title: "About UniPOS - Modern POS Software",
    description:
      "Learn about UniPOS, a modern cloud-based POS system and subsidiary of DotcomOne. We help businesses manage sales, inventory, customers, billing, and reporting with ease.",
    url: "/about-us",
  },
};

export default function AboutPage() {
  return (
    <MarketingPageShell title="About UniPOS">
      <p>
        Welcome to <strong>UniPOS</strong>, a modern Point of Sale solution designed to simplify business management
        for retailers, restaurants, cafés, supermarkets, pharmacies, and businesses of all sizes.
      </p>
      <p>
        Our mission is to provide a fast, secure, and easy-to-use POS platform that helps businesses streamline
        sales, inventory, customer management, reporting, and day-to-day operations — all from a single dashboard.
      </p>
      <p>
        <strong>UniPOS is a subsidiary of DotcomOne</strong>, a technology company focused on developing innovative
        software solutions that empower businesses through modern digital technologies.
      </p>

      <h2>Why Choose UniPOS?</h2>
      <ul>
        <li>Fast and intuitive interface</li>
        <li>Secure cloud-based access</li>
        <li>Real-time sales and inventory tracking</li>
        <li>Detailed reports and analytics</li>
        <li>Multi-business support</li>
        <li>Regular updates and new features</li>
        <li>Dedicated customer support</li>
      </ul>

      <p>
        We are committed to continuously improving UniPOS by introducing new features, enhancing security, and
        delivering a reliable platform that businesses can trust.
      </p>
      <p>Thank you for choosing UniPOS. We look forward to being a part of your business success.</p>
    </MarketingPageShell>
  );
}
