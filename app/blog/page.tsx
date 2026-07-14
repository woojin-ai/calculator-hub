import type { Metadata } from "next";
import { getAllBlogPosts } from "@/lib/blog";
import BlogPostCard from "@/components/BlogPostCard";

export const metadata: Metadata = {
  title: "블로그 | 계산기 허브",
  description: "계산기 활용법과 생활 정보를 정리한 글 모음입니다.",
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
        블로그
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        계산기 활용법과 생활 정보를 정리한 글 모음입니다.
      </p>

      {posts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center text-sm text-brand-text-secondary">
          아직 등록된 글이 없습니다. 곧 찾아뵙겠습니다.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
