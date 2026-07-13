import type { CalculatorMeta } from "@/lib/calculators";
import CalculatorCard from "@/components/CalculatorCard";

export default function RelatedCalculators({
  calculators,
}: {
  calculators: CalculatorMeta[];
}) {
  if (calculators.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">관련 계산기</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calculators.map((calculator) => (
          <CalculatorCard key={calculator.slug} calculator={calculator} />
        ))}
      </div>
    </section>
  );
}
