import type { FaqItem } from "@/lib/calculators";

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">자주 묻는 질문</h2>
      <div className="divide-y divide-brand-border rounded-xl border border-brand-border bg-brand-surface">
        {items.map((item) => (
          <details key={item.question} className="group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-brand-text marker:content-none">
              {item.question}
              <span className="shrink-0 text-brand-text-secondary transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-brand-text-secondary">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
