import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `${categoryInfo.life.title} | 계산기 허브`,
  description: categoryInfo.life.description,
  alternates: { canonical: canonicalUrl("/life") },
};

export default function LifePage() {
  return <CategoryPage category="life" />;
}
