import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  calculators,
  categoryInfo,
  getCalculatorsByCategory,
  type CalculatorCategory,
} from "@/lib/calculators";
import CalculatorCard from "@/components/CalculatorCard";
import { canonicalUrl } from "@/lib/site";

// canonical만 지정한다. title/description은 의도적으로 비워 루트 layout.tsx의 값을 그대로 상속받는다.
export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

const CATEGORY_ORDER: CalculatorCategory[] = ["salary", "loan", "date", "life"];

// 카테고리 아이콘 배지 (design/visual-richness-plan.md 2-1) — 급여/대출/날짜는 blue, 생활은 emerald 톤
const CATEGORY_ICON: Record<
  CalculatorCategory,
  { src: string; alt: string; badgeBg: string }
> = {
  salary: {
    src: "/images/icons/salary.webp",
    alt: "급여 계산기 아이콘",
    badgeBg: "bg-blue-50",
  },
  loan: {
    src: "/images/icons/loan.webp",
    alt: "대출 계산기 아이콘",
    badgeBg: "bg-blue-50",
  },
  date: {
    src: "/images/icons/date.webp",
    alt: "날짜 계산기 아이콘",
    badgeBg: "bg-blue-50",
  },
  life: {
    src: "/images/icons/life.webp",
    alt: "생활 계산기 아이콘",
    badgeBg: "bg-emerald-50",
  },
};

export default function Home() {
  const liveCalculators = calculators.filter((c) => c.status === "live");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-4 py-10 text-center sm:px-8 sm:py-14 sm:text-left lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div className="lg:max-w-md">
          <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
            계산기 허브
          </h1>
          <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
            만 나이, 연봉 실수령액, 대출 이자, D-Day 등 실생활에 필요한 계산기를
            카테고리별로 모아 무료로 제공합니다.
          </p>
        </div>
        {/* 데스크톱(lg 이상)에서만 노출, 모바일/태블릿에서는 숨김 (visual-richness-plan.md 1-1) */}
        <div className="hidden shrink-0 lg:block">
          <Image
            src="/images/hero-illustration.webp"
            alt="계산기 허브 소개 일러스트"
            width={380}
            height={380}
            priority
            className="h-auto w-[320px] xl:w-[380px]"
          />
        </div>
      </section>

      {liveCalculators.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-brand-text">
            지금 사용 가능한 계산기
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {liveCalculators.map((calculator) => (
              <div
                key={calculator.slug}
                className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.6667rem)]"
              >
                <CalculatorCard calculator={calculator} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-brand-text">카테고리</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((category) => {
            const liveCount = getCalculatorsByCategory(category).filter(
              (c) => c.status === "live"
            ).length;

            const icon = CATEGORY_ICON[category];

            return (
              <Link
                key={category}
                href={`/${category}`}
                className="flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-surface p-5 transition-all hover:border-brand-primary hover:shadow-md"
              >
                <span
                  className={`mb-1 inline-flex h-12 w-12 items-center justify-center rounded-full ${icon.badgeBg}`}
                >
                  <Image src={icon.src} alt={icon.alt} width={24} height={24} />
                </span>
                <h3 className="text-base font-semibold text-brand-text">
                  {categoryInfo[category].title}
                </h3>
                <p className="text-pretty text-xs leading-relaxed text-brand-text-secondary">
                  {categoryInfo[category].description}
                </p>
                <p className="text-xs text-brand-text-secondary">
                  {liveCount > 0 ? `라이브 계산기 ${liveCount}개` : "준비 중"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
