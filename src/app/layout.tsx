import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://unipos.lk";

const SITE_KEYWORDS = [
  // Primary
  "web based POS system",
  "sri lankan pos",
  "dotcomone pos",
  "free pos",
  "manuja Damsara",
  "browser based POS software",
  "offline POS system",
  "POS software for small businesses",
  "retail POS system",
  "restaurant POS software",
  "inventory management POS",
  "point of sale software",
  "affordable POS system",
  // Secondary
  "barcode POS system",
  "inventory tracking software",
  "sales management software",
  "customer management POS",
  "pharmacy POS software",
  "supermarket POS system",
  "shop billing software",
  "receipt printing software",
  "business analytics software",
  "offline billing software",
  // Long-tail
  "best POS system for small businesses",
  "affordable POS software without monthly fees",
  "browser based POS system for retail stores",
  "offline POS software with inventory management",
  "POS system for supermarkets and pharmacies",
  "easy to use POS software for restaurants",
  "local data storage POS system",
  "POS software without cloud subscription",
  "simple billing software for small shops",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UniPOS – Modern Web-Based POS System for Retail, Restaurants & Shops",
    template: "%s | UniPOS",
  },
  description:
    "UniPOS is a modern browser-based POS system for retailers, restaurants, pharmacies, and supermarkets. Manage sales, inventory, customers, reports, and receipts securely with no cloud dependency or monthly server fees.",
  keywords: SITE_KEYWORDS,
  authors: [{ name: "DotcomOne" }],
  creator: "DotcomOne",
  publisher: "DotcomOne",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "UniPOS",
    title: "UniPOS – Modern Web-Based POS System for Retail, Restaurants & Shops",
    description:
      "UniPOS is a powerful and affordable Point of Sale solution designed for retailers, restaurants, pharmacies, and supermarkets. Manage products, inventory, customers, sales, and reports from one simple browser-based system.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "UniPOS – Modern Web-Based POS System",
    description: "Browser-based POS with local data storage. No cloud dependency, no monthly server fees. Built for retail, restaurants & shops.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "UniPOS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "UniPOS is a modern cloud-based Point of Sale (POS) software designed to help businesses efficiently manage sales, inventory, billing, customers, employees, and reporting. Built with speed, security, and simplicity in mind, UniPOS is suitable for retailers, restaurants, cafés, pharmacies, supermarkets, and businesses of all sizes. UniPOS is a subsidiary of DotcomOne, dedicated to delivering reliable and innovative business software solutions.",
  publisher: {
    "@type": "Organization",
    name: "DotcomOne",
  },
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAFC]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
