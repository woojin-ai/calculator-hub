import { toBlogListItems, type BlogPost } from "@/lib/blog";
import BlogPostCard from "@/components/BlogPostCard";

export default function RelatedBlogPosts({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  // BlogPostCard는 경량 데이터(BlogListItem)만 받는다 — 읽는 시간은 여기서 미리 계산.
  const items = toBlogListItems(posts);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">관련 글</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <BlogPostCard key={post.slug} post={post} headingLevel="h3" />
        ))}
      </div>
    </section>
  );
}
