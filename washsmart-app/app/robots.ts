import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep crawlers on public marketing pages; the auth-gated
        // subscriber/partner/admin shells and API routes carry no
        // indexable content.
        disallow: ["/api/", "/admin/", "/partner/", "/app/"],
      },
    ],
    sitemap: "https://washsmart.ng/sitemap.xml",
  };
}
