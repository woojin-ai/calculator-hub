import type { BlogPost } from "@/lib/blog";
import BlogPostCard from "@/components/BlogPostCard";

export default function RelatedBlogPosts({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-brand-text">관련 글</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogPostCard key={post.slug} post={post} headingLevel="h3" />
        ))}
      </div>
    </section>
  );
}
