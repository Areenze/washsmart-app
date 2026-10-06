import type { MetadataRoute } from "next";

const BASE_URL = "https://washsmart.ng";

type Page = {
  path: string;
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
};

// Public marketing pages only — auth-gated shells are excluded from the
// sitemap and disallowed in robots.txt.
const PAGES: Page[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/find-a-wash", priority: 0.9, changeFrequency: "weekly" },
  { path: "/join", priority: 0.9, changeFrequency: "monthly" },
  { path: "/join/apply", priority: 0.7, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: `${BASE_URL}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
