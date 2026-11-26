import type { MetadataRoute } from "next";
import { calculators } from "@/lib/calculators";
import { blogPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/salary`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/loan`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/date`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/life`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 콘텐츠가 없는 coming-soon 스텁 페이지는 검색엔진에 노출시키지 않는다.
  const liveCalculatorPages: MetadataRoute.Sitemap = calculators
    .filter((calculator) => calculator.status === "live")
    .map((calculator) => ({
      url: `${SITE_URL}/calculator/${calculator.slug}`,
      changeFrequency: "monthly",
      priority: 0.8,
    }));

  const blogPostPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedDate ?? post.publishedDate,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...liveCalculatorPages, ...blogPostPages];
}
