import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";

export const metadata: Metadata = {
  title: `${categoryInfo.loan.title} | 계산기 허브`,
  description: categoryInfo.loan.description,
};

export default function LoanPage() {
  return <CategoryPage category="loan" />;
}
