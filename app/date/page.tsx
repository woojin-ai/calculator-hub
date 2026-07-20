import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `${categoryInfo.date.title} | 계산기 허브`,
  description: categoryInfo.date.description,
  alternates: { canonical: canonicalUrl("/date") },
};

export default function DatePage() {
  return <CategoryPage category="date" />;
}
