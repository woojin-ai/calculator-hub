import Link from "next/link";
import { categoryInfo } from "@/lib/calculators";
import { getReadingTimeMinutes, type BlogPost } from "@/lib/blog";
import { FOCUS_RING_CARD } from "@/lib/focusRing";

// 발행일 "YYYY-MM-DD" → "2026. 7. 15." 표기 (ko-KR).
function formatPublishedDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}

export default function BlogPostCard({
  post,
  headingLevel = "h2",
}: {
  post: BlogPost;
  headingLevel?: "h2" | "h3";
}) {
  const readingMinutes = getReadingTimeMinutes(post);
  const HeadingTag = headingLevel;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-surface p-4 transition-all hover:border-brand-primary hover:shadow-md ${FOCUS_RING_CARD}`}
    >
      <div className="flex">
        <span className="self-start rounded-full bg-brand-bg px-2 py-0.5 text-xs font-medium text-brand-text-secondary">
          {categoryInfo[post.category].title}
        </span>
      </div>
      <HeadingTag className="line-clamp-2 text-base font-semibold text-brand-text group-hover:text-brand-primary sm:text-lg">
        {post.title}
      </HeadingTag>
      <p className="line-clamp-2 text-pretty text-xs leading-relaxed text-brand-text-secondary sm:text-sm">
        {post.description}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs text-brand-text-secondary">
        <time dateTime={post.publishedDate} className="tabular-nums">
          {formatPublishedDate(post.publishedDate)}
        </time>
        <span aria-hidden="true">·</span>
        <span>읽는 시간 {readingMinutes}분</span>
      </div>
    </Link>
  );
}
