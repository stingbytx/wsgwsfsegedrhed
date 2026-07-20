import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/pos", "/inventory", "/customers", "/reports", "/settings", "/api"],
    },
    sitemap: "https://unipos.lk/sitemap.xml",
  };
}
