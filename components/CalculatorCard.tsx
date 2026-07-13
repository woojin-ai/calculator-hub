import Link from "next/link";
import type { CalculatorMeta } from "@/lib/calculators";

export default function CalculatorCard({
  calculator,
}: {
  calculator: CalculatorMeta;
}) {
  const isLive = calculator.status === "live";

  return (
    <Link
      href={`/calculator/${calculator.slug}`}
      className="group flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-surface p-4 transition-all hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-brand-text">
          {calculator.title}
        </h3>
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            />
            바로 사용 가능
          </span>
        ) : (
          <span className="rounded-full bg-brand-bg px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
            준비 중
          </span>
        )}
      </div>
      <p className="text-pretty text-xs leading-relaxed text-brand-text-secondary">
        {calculator.shortDescription}
      </p>
    </Link>
  );
}
