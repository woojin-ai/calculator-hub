import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/site";
import { buildOpenGraph } from "@/lib/og";
import { FOCUS_RING_LINK_ROUNDED } from "@/lib/focusRing";
import { excelLessons, EXCEL_TOTAL_PROBLEMS } from "@/lib/excel/lessons";
import LessonProgress from "@/components/excel/LessonProgress";

export const metadata: Metadata = {
  title: "엑셀 함수 연습 문제 | 계산기 허브",
  description:
    "동영상 강의 대신 브라우저 속 엑셀 시트에 직접 수식을 쳐 보며 SUM, COUNTIF, IF, VLOOKUP 같은 함수를 익히세요. 회원가입 없이 무료, 바로 채점해 줍니다.",
  alternates: { canonical: canonicalUrl("/excel") },
  openGraph: buildOpenGraph({ path: "/excel" }),
};

export default function ExcelLessonsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">엑셀 함수 연습</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-text-secondary sm:text-base">
        영상으로 보면 알 것 같은데, 막상 엑셀을 열면 손이 안 움직이죠. 여기서는 설명을 읽는 대신 시트에 수식을 직접 쳐 봅니다.
        입력하면 바로 계산해서 맞았는지 알려 주고, 틀리면 어디가 틀렸는지 짚어 줍니다. 회원가입 없이 무료입니다.
      </p>

      <section aria-labelledby="excel-lessons-heading" className="mt-8">
        <h2 id="excel-lessons-heading" className="text-lg font-semibold text-brand-text">
          레슨 {excelLessons.length}개 · 문제 {EXCEL_TOTAL_PROBLEMS}개
        </h2>
        <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {excelLessons.map((lesson) => (
            <li key={lesson.slug}>
              <Link
                href={`/excel/${lesson.slug}`}
                className={`flex h-full flex-col rounded-xl border border-brand-border bg-brand-surface p-5 transition-colors hover:border-brand-primary ${FOCUS_RING_LINK_ROUNDED}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {lesson.order}
                  </span>
                  <span className="text-xs text-brand-text-secondary">문제 {lesson.problems.length}개</span>
                  <span className="ml-auto">
                    <LessonProgress ids={lesson.problems.map((p) => p.id)} />
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-brand-text">{lesson.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-brand-text-secondary">{lesson.summary}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="excel-why-heading" className="mt-12 max-w-3xl space-y-3 text-sm leading-relaxed text-brand-text sm:text-base">
        <h2 id="excel-why-heading" className="text-lg font-semibold">왜 직접 쳐 봐야 할까요?</h2>
        <p>
          엑셀 함수는 운전과 비슷합니다. 강의를 열 번 보는 것보다 한 번 직접 해 보는 쪽이 오래 남습니다. 특히
          컴퓨터활용능력(컴활) 실기처럼 정해진 시간 안에 수식을 빠르게 써야 하는 시험은, 함수 이름과 인수 순서가 손에 익어 있어야
          합니다.
        </p>
        <p>
          이 연습장은 입력한 수식을 실제로 계산해서 결과로 채점합니다. 그래서 <code className="font-mono">=SUM(B2:B6)</code>와{" "}
          <code className="font-mono">=SUM(B2,B3,B4,B5,B6)</code>처럼 쓰는 방법이 달라도 결과가 맞으면 정답입니다. 반대로 답
          숫자를 직접 적거나 범위를 우연히 맞춘 경우는 표의 숫자를 바꿔 한 번 더 확인해서 걸러냅니다.
        </p>
        <p className="text-brand-text-secondary">
          푼 문제 기록은 이 브라우저에만 저장되고 어디에도 보내지 않습니다. 날짜 함수와 피벗 테이블 레슨은 준비 중입니다.
        </p>
      </section>
    </div>
  );
}
