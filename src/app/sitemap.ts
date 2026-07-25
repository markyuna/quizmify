import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const routes = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
    { path: "/login", changeFrequency: "yearly" as const, priority: 0.5 },
    { path: "/register", changeFrequency: "yearly" as const, priority: 0.5 },
    { path: "/upgrade", changeFrequency: "monthly" as const, priority: 0.7 },
    { path: "/cgu-cgv", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/confidentialite", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/mentions-legales", changeFrequency: "yearly" as const, priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
