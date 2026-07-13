import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";

export const metadata: Metadata = {
  title: `${categoryInfo.date.title} | 계산기 허브`,
  description: categoryInfo.date.description,
};

export default function DatePage() {
  return <CategoryPage category="date" />;
}
