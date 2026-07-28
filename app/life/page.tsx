import type { Metadata } from "next";
import CategoryPage from "@/components/CategoryPage";
import { categoryInfo } from "@/lib/calculators";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";

export const metadata: Metadata = {
  title: `${categoryInfo.life.title} | 계산기 허브`,
  // SERP 스니펫 전용. 화면(CategoryPage 리드·홈/about 카드)과 JSON-LD는 description을 쓴다.
  description: categoryInfo.life.metaDescription ?? categoryInfo.life.description,
  alternates: { canonical: canonicalUrl("/life") },
  openGraph: buildOpenGraph({ path: "/life" }),
};

export default function LifePage() {
  return <CategoryPage category="life" />;
}
