import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `${categoryInfo.salary.title} | 계산기 허브`,
  description: categoryInfo.salary.description,
  alternates: { canonical: canonicalUrl("/salary") },
};

export default function SalaryPage() {
  return <CategoryPage category="salary" />;
}
