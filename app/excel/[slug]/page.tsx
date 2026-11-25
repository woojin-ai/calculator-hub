import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";
import { FOCUS_RING_LINK_ROUNDED } from "@/lib/focusRing";
import { excelLessons, getAdjacentLessons, getExcelLesson } from "@/lib/excel/lessons";
import ExcelPractice from "@/components/excel/ExcelPractice";

export function generateStaticParams() {
  return excelLessons.map((lesson) => ({ slug: lesson.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getExcelLesson(slug);
  if (!lesson) return {};
  return {
    title: `엑셀 ${lesson.title} 연습 문제 | 계산기 허브`,
    description: `${lesson.summary} 브라우저 속 시트에 직접 입력하면 바로 채점해 줍니다. 무료, 회원가입 없음.`,
    alternates: { canonical: canonicalUrl(`/excel/${lesson.slug}`) },
    openGraph: buildOpenGraph({ path: `/excel/${lesson.slug}` }),
  };
}

export default async function ExcelLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getExcelLesson(slug);
  if (!lesson) notFound();
  const { prev, next } = getAdjacentLessons(lesson.slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="이동 경로" className="text-sm text-brand-text-secondary">
        <Link href="/excel" className={`hover:text-brand-primary ${FOCUS_RING_LINK_ROUNDED}`}>
          엑셀 함수 연습
        </Link>
        <span aria-hidden> › </span>
        <span>레슨 {lesson.order}</span>
      </nav>
      <h1 className="mt-2 text-2xl font-bold text-brand-text sm:text-[2rem]">{lesson.title} 연습</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-text-secondary sm:text-base">{lesson.intro}</p>

      <div className="mt-6">
        <ExcelPractice
          problems={lesson.problems}
          nextLesson={next ? { slug: next.slug, title: next.title } : undefined}
        />
      </div>

      <section aria-labelledby="excel-functions-heading" className="mt-10">
        <h2 id="excel-functions-heading" className="text-lg font-semibold text-brand-text">
          이 레슨에서 쓰는 함수
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {lesson.functions.map((fn) => (
            <div key={fn.name} className="rounded-lg border border-brand-border bg-brand-surface p-4">
              <dt className="font-mono font-semibold text-brand-text">{fn.name}</dt>
              <dd className="mt-1 space-y-1 text-sm leading-relaxed text-brand-text">
                <p>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em]">{fn.syntax}</code>
                </p>
                <p>{fn.desc}</p>
                <p className="text-brand-text-secondary">
                  예: <code className="font-mono">{fn.example}</code>
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="레슨 이동" className="mt-10 flex flex-wrap justify-between gap-3 border-t border-brand-border pt-6 text-sm">
        {prev ? (
          <Link href={`/excel/${prev.slug}`} className={`text-brand-primary hover:underline ${FOCUS_RING_LINK_ROUNDED}`}>
            ← 레슨 {prev.order}. {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/excel/${next.slug}`} className={`text-brand-primary hover:underline ${FOCUS_RING_LINK_ROUNDED}`}>
            레슨 {next.order}. {next.title} →
          </Link>
        ) : (
          <Link href="/excel" className={`text-brand-primary hover:underline ${FOCUS_RING_LINK_ROUNDED}`}>
            레슨 목록 →
          </Link>
        )}
      </nav>
    </div>
  );
}
