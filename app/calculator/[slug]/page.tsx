import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  calculators,
  categoryInfo,
  getCalculatorBySlug,
  getRelatedCalculators,
} from "@/lib/calculators";
import { buildCalculatorJsonLd } from "@/lib/calculator-jsonld";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";
import { FOCUS_RING_LINK_ROUNDED } from "@/lib/focusRing";
import AgeCalculator from "@/components/AgeCalculator";
import AnnualLeaveAllowanceCalculator from "@/components/AnnualLeaveAllowanceCalculator";
import DdayCalculator from "@/components/DdayCalculator";
import BmiCalculator from "@/components/BmiCalculator";
import CarTaxCalculator from "@/components/CarTaxCalculator";
import DsrCalculator from "@/components/DsrCalculator";
import ElectricityBillCalculator from "@/components/ElectricityBillCalculator";
import FourInsuranceCalculator from "@/components/FourInsuranceCalculator";
import LoanInterestCalculator from "@/components/LoanInterestCalculator";
import LoanPrepaymentFeeCalculator from "@/components/LoanPrepaymentFeeCalculator";
import SalaryNetCalculator from "@/components/SalaryNetCalculator";
import SavingsInterestCalculator from "@/components/SavingsInterestCalculator";
import ServicePeriodCalculator from "@/components/ServicePeriodCalculator";
import SeverancePayCalculator from "@/components/SeverancePayCalculator";
import UnitConverter from "@/components/UnitConverter";
import WeeklyHolidayAllowanceCalculator from "@/components/WeeklyHolidayAllowanceCalculator";
import ResultInterpretation from "@/components/ResultInterpretation";
import FaqAccordion from "@/components/FaqAccordion";
import RelatedCalculators from "@/components/RelatedCalculators";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import { getBlogPostsForCalculator } from "@/lib/blog";

// slug별 실제 계산기 UI 컴포넌트 매핑 (아직 구현되지 않은 계산기는 매핑하지 않는다)
const CALCULATOR_COMPONENTS: Record<string, React.ComponentType> = {
  "age-calculator": AgeCalculator,
  "annual-leave-allowance-calculator": AnnualLeaveAllowanceCalculator,
  "dday-calculator": DdayCalculator,
  "bmi-calculator": BmiCalculator,
  "car-tax-calculator": CarTaxCalculator,
  "dsr-calculator": DsrCalculator,
  "electricity-bill-calculator": ElectricityBillCalculator,
  "four-insurance-calculator": FourInsuranceCalculator,
  "loan-interest-calculator": LoanInterestCalculator,
  "loan-prepayment-fee": LoanPrepaymentFeeCalculator,
  "salary-net-calculator": SalaryNetCalculator,
  "savings-interest-calculator": SavingsInterestCalculator,
  "service-period-calculator": ServicePeriodCalculator,
  "severance-pay-calculator": SeverancePayCalculator,
  "unit-converter": UnitConverter,
  "weekly-holiday-allowance-calculator": WeeklyHolidayAllowanceCalculator,
};

export function generateStaticParams() {
  return calculators.map((calculator) => ({ slug: calculator.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const calculator = getCalculatorBySlug(slug);
  if (!calculator) return {};

  return {
    title: `${calculator.title} | 계산기 허브`,
    // SERP 스니펫 전용 metaDescription이 있으면 그것을, 없으면 화면용 shortDescription을 쓴다.
    // 화면(아래 리드 문단·CalculatorCard)과 JSON-LD는 계속 shortDescription을 쓴다 — 의도된 분리.
    description: calculator.metaDescription ?? calculator.shortDescription,
    // 자기참조 canonical. raw slug가 아니라 조회로 확정된 calculator.slug를 쓴다
    // (존재하지 않는 slug는 위에서 {}로 조기 반환되어 여기 도달하지 않는다).
    alternates: { canonical: canonicalUrl(`/calculator/${calculator.slug}`) },
    // 계산기는 기사가 아니라 도구이므로 og:type=website다(사양 §4).
    // coming-soon(noindex)에도 분기 없이 동일하게 붙인다 — OG는 색인이 아니라 공유 프리뷰용(§5-5).
    openGraph: buildOpenGraph({ path: `/calculator/${calculator.slug}` }),
    // coming-soon 스텁 페이지는 콘텐츠가 없으므로 검색엔진 색인에서 제외한다.
    robots:
      calculator.status === "coming-soon"
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const calculator = getCalculatorBySlug(slug);

  if (!calculator) {
    notFound();
  }

  const CalculatorComponent = CALCULATOR_COMPONENTS[calculator.slug];
  const related = getRelatedCalculators(calculator.slug);
  const relatedPosts = getBlogPostsForCalculator(calculator.slug);
  const jsonLd = buildCalculatorJsonLd(calculator);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <nav
        aria-label="현재 위치"
        className="-ml-3 mb-2 flex flex-wrap items-center gap-2 text-sm text-brand-text-secondary"
      >
        <Link
          href="/"
          className={`inline-flex min-h-9 items-center px-3 transition-colors hover:text-brand-primary ${FOCUS_RING_LINK_ROUNDED}`}
        >
          홈
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/${calculator.category}`}
          className={`inline-flex min-h-9 items-center px-3 transition-colors hover:text-brand-primary ${FOCUS_RING_LINK_ROUNDED}`}
        >
          {categoryInfo[calculator.category].title}
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
        {calculator.title}
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        {calculator.shortDescription}
      </p>

      <div className="mt-6">
        {CalculatorComponent ? (
          <CalculatorComponent />
        ) : (
          <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface p-6 text-center text-sm text-brand-text-secondary">
            이 계산기는 현재 준비 중입니다. 빠른 시일 내에 오픈할 예정이니
            조금만 기다려 주세요.
          </div>
        )}
      </div>

      {calculator.interpretation && (
        <ResultInterpretation text={calculator.interpretation} />
      )}

      {calculator.faq && <FaqAccordion items={calculator.faq} />}

      {calculator.status === "live" && (
        <RelatedCalculators calculators={related} columns={2} />
      )}

      {calculator.status === "live" && (
        <RelatedBlogPosts posts={relatedPosts} columns={2} />
      )}
    </div>
  );
}
