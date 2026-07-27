import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";

export const metadata: Metadata = {
  title: `${categoryInfo.loan.title} | 계산기 허브`,
  description: categoryInfo.loan.description,
  alternates: { canonical: canonicalUrl("/loan") },
  openGraph: buildOpenGraph({ path: "/loan" }),
};

export default function LoanPage() {
  return <CategoryPage category="loan" />;
}
