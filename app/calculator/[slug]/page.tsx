import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  calculators,
  categoryInfo,
  getCalculatorBySlug,
  getRelatedCalculators,
} from "@/lib/calculators";
import AgeCalculator from "@/components/AgeCalculator";
import DdayCalculator from "@/components/DdayCalculator";
import BmiCalculator from "@/components/BmiCalculator";
import ElectricityBillCalculator from "@/components/ElectricityBillCalculator";
import FourInsuranceCalculator from "@/components/FourInsuranceCalculator";
import LoanInterestCalculator from "@/components/LoanInterestCalculator";
import LoanPrepaymentFeeCalculator from "@/components/LoanPrepaymentFeeCalculator";
import SalaryNetCalculator from "@/components/SalaryNetCalculator";
import ServicePeriodCalculator from "@/components/ServicePeriodCalculator";
import SeverancePayCalculator from "@/components/SeverancePayCalculator";
import UnitConverter from "@/components/UnitConverter";
import ResultInterpretation from "@/components/ResultInterpretation";
import FaqAccordion from "@/components/FaqAccordion";
import RelatedCalculators from "@/components/RelatedCalculators";

// slug별 실제 계산기 UI 컴포넌트 매핑 (아직 구현되지 않은 계산기는 매핑하지 않는다)
const CALCULATOR_COMPONENTS: Record<string, React.ComponentType> = {
  "age-calculator": AgeCalculator,
  "dday-calculator": DdayCalculator,
  "bmi-calculator": BmiCalculator,
  "electricity-bill-calculator": ElectricityBillCalculator,
  "four-insurance-calculator": FourInsuranceCalculator,
  "loan-interest-calculator": LoanInterestCalculator,
  "loan-prepayment-fee": LoanPrepaymentFeeCalculator,
  "salary-net-calculator": SalaryNetCalculator,
  "service-period-calculator": ServicePeriodCalculator,
  "severance-pay-calculator": SeverancePayCalculator,
  "unit-converter": UnitConverter,
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
    description: calculator.shortDescription,
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-2 text-xs text-brand-text-secondary">
        <Link href="/" className="hover:text-brand-primary">
          홈
        </Link>{" "}
        /{" "}
        <Link
          href={`/${calculator.category}`}
          className="hover:text-brand-primary"
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
        <RelatedCalculators calculators={related} />
      )}
    </div>
  );
}
