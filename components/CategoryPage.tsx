import {
  categoryInfo,
  getCalculatorsByCategory,
  type CalculatorCategory,
} from "@/lib/calculators";
import CalculatorCard from "@/components/CalculatorCard";
import RelatedBlogPosts from "@/components/RelatedBlogPosts";
import { getBlogPostsByCategory } from "@/lib/blog";
import { buildCategoryJsonLd } from "@/lib/site-jsonld";

export default function CategoryPage({
  category,
}: {
  category: CalculatorCategory;
}) {
  const info = categoryInfo[category];
  const items = getCalculatorsByCategory(category);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildCategoryJsonLd(category)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
        {info.title}
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        {info.description}
      </p>

      <section aria-labelledby="calc-list-heading">
        <h2 id="calc-list-heading" className="sr-only">
          계산기 목록
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((calculator) => (
            <CalculatorCard key={calculator.slug} calculator={calculator} />
          ))}
        </div>
      </section>

      <RelatedBlogPosts posts={getBlogPostsByCategory(category)} />
    </div>
  );
}
