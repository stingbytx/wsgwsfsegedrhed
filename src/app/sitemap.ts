import type { MetadataRoute } from "next";

const SITE_URL = "https://unipos.lk";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about-us", "/terms-and-conditions", "/contact", "/login", "/signup"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.7,
  }));
}
