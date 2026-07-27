import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";

export const metadata: Metadata = {
  title: `${categoryInfo.life.title} | 계산기 허브`,
  description: categoryInfo.life.description,
  alternates: { canonical: canonicalUrl("/life") },
  openGraph: buildOpenGraph({ path: "/life" }),
};

export default function LifePage() {
  return <CategoryPage category="life" />;
}
