import type { CalculatorMeta } from "@/lib/calculators";
import CalculatorCard from "@/components/CalculatorCard";

// Tailwind JIT는 문자열 조합 클래스를 스캔하지 못하므로 반드시 완전한 클래스 문자열을 상수로 둔다.
const GRID_CLASS = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
} as const;

export default function RelatedCalculators({
  calculators,
  columns = 3,
}: {
  calculators: CalculatorMeta[];
  columns?: 2 | 3;
}) {
  if (calculators.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">관련 계산기</h2>
      <div className={GRID_CLASS[columns]}>
        {calculators.map((calculator) => (
          <CalculatorCard key={calculator.slug} calculator={calculator} />
        ))}
      </div>
    </section>
  );
}
