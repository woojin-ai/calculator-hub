import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그 | 계산기 허브",
  description: "계산기 활용법과 생활 정보를 다루는 블로그 콘텐츠를 준비 중입니다.",
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
        블로그
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary sm:text-base">
        계산기 활용법, 생활 정보 등을 다루는 블로그 콘텐츠를 준비하고
        있습니다. 자동 생성 글은 추후 이 영역에 순차적으로 게시될 예정입니다.
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center text-sm text-brand-text-secondary">
        아직 등록된 글이 없습니다. 곧 찾아뵙겠습니다.
      </div>
    </div>
  );
}
