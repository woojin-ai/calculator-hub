import { toBlogListItems, type BlogPost } from "@/lib/blog";
import BlogPostCard from "@/components/BlogPostCard";

// Tailwind JIT는 문자열 조합 클래스를 스캔하지 못하므로 반드시 완전한 클래스 문자열을 상수로 둔다.
const GRID_CLASS = {
  2: "grid grid-cols-1 gap-4 sm:grid-cols-2",
  3: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
} as const;

export default function RelatedBlogPosts({
  posts,
  headingText = "관련 글",
  columns = 3,
}: {
  posts: BlogPost[];
  headingText?: string;
  columns?: 2 | 3;
}) {
  if (posts.length === 0) return null;

  // BlogPostCard는 경량 데이터(BlogListItem)만 받는다 — 읽는 시간은 여기서 미리 계산.
  const items = toBlogListItems(posts);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">{headingText}</h2>
      <div className={GRID_CLASS[columns]}>
        {items.map((post) => (
          <BlogPostCard key={post.slug} post={post} headingLevel="h3" />
        ))}
      </div>
    </section>
  );
}
