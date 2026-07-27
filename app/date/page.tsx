import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";

export const metadata: Metadata = {
  title: `${categoryInfo.date.title} | 계산기 허브`,
  description: categoryInfo.date.description,
  alternates: { canonical: canonicalUrl("/date") },
  openGraph: buildOpenGraph({ path: "/date" }),
};

export default function DatePage() {
  return <CategoryPage category="date" />;
}
