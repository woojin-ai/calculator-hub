import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";

export const metadata: Metadata = {
  title: `${categoryInfo.loan.title} | 계산기 허브`,
  // SERP 스니펫 전용. 화면(CategoryPage 리드·홈/about 카드)과 JSON-LD는 description을 쓴다.
  description: categoryInfo.loan.metaDescription ?? categoryInfo.loan.description,
  alternates: { canonical: canonicalUrl("/loan") },
  openGraph: buildOpenGraph({ path: "/loan" }),
};

export default function LoanPage() {
  return <CategoryPage category="loan" />;
}
