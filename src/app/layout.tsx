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
  "UniPOS",
  "POS Software",
  "Point of Sale System",
  "Billing Software",
  "Cloud POS",
  "Retail POS",
  "Restaurant POS",
  "Inventory Management",
  "Sales Management",
  "Business Software",
  "Multi Store POS",
  "POS Sri Lanka",
  "DotcomOne",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UniPOS | Modern Cloud Point of Sale (POS) Software for Businesses",
    template: "%s | UniPOS",
  },
  description:
    "UniPOS is a modern cloud-based Point of Sale (POS) software for retailers, restaurants, cafés, supermarkets, pharmacies, and businesses. Manage sales, inventory, customers, billing, reports, and more from anywhere.",
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
    title: "UniPOS | Smart Cloud POS Software",
    description:
      "Manage sales, inventory, billing, customers, and reports with UniPOS. A modern cloud-based POS solution developed as a subsidiary of DotcomOne.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "UniPOS | Cloud POS Software",
    description: "A powerful cloud POS system for businesses. Fast, secure, and easy to use.",
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
