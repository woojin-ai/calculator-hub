import type { Metadata } from "next";
import Link from "next/link";
import {
  categoryInfo,
  getCalculatorsByCategory,
  type CalculatorCategory,
} from "@/lib/calculators";

const CATEGORY_ORDER: CalculatorCategory[] = ["salary", "loan", "date", "life"];

export const metadata: Metadata = {
  title: "계산기 허브 소개 | 계산기 허브",
  description:
    "계산기 허브는 급여, 대출, 날짜, 생활 등 일상에서 자주 필요한 계산을 무료로 제공하는 계산기 모음 사이트입니다.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="text-center sm:text-left">
        <div className="mx-auto max-w-2xl sm:mx-0">
          <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
            계산기 허브 소개
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
            계산기 허브는 연봉, 대출, 날짜, 건강 등 일상에서 자주 필요한
            계산을 누구나 회원가입이나 설치 없이 바로 이용할 수 있도록 만든
            무료 계산기 모음 사이트입니다. 복잡한 공식을 직접 찾아보지
            않아도, 몇 가지 값만 입력하면 결과와 함께 그 결과를 어떻게
            이해하고 활용하면 좋은지까지 쉬운 설명으로 함께 제공하는 것을
            목표로 합니다. 계산기는 실제 생활에서 자주 쓰이는 순서대로
            하나씩 추가해 나가고 있으며, 앞으로도 급여·대출·날짜·생활 전
            영역에 걸쳐 계산기 종류를 계속 늘려갈 예정입니다.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-brand-text">
          제공 중인 계산기 카테고리
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          계산기는 아래 네 가지 카테고리로 나누어 제공합니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_ORDER.map((category) => {
            const liveCount = getCalculatorsByCategory(category).filter(
              (c) => c.status === "live"
            ).length;

            return (
              <Link
                key={category}
                href={`/${category}`}
                className="flex flex-col gap-2 rounded-xl border border-brand-border bg-brand-surface p-5 transition-all hover:border-brand-primary hover:shadow-md"
              >
                <h3 className="text-base font-semibold text-brand-text">
                  {categoryInfo[category].title}
                </h3>
                <p className="text-xs leading-relaxed text-brand-text-secondary">
                  {categoryInfo[category].description}
                </p>
                <p className="text-xs text-brand-text-secondary">
                  {liveCount > 0 ? `라이브 계산기 ${liveCount}개` : "준비 중"}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          <p>현재 바로 사용할 수 있는 계산기는 다음과 같습니다.</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>만 나이 계산기 — 생년월일로 오늘 기준 만 나이를 계산합니다.</li>
            <li>D-Day 계산기 — 기준일까지 남은(또는 지난) 일수를 계산합니다.</li>
            <li>BMI 계산기 — 키와 몸무게로 체질량지수를 계산합니다.</li>
          </ul>
          <p className="mt-3">
            급여·대출 카테고리 계산기는 현재 준비 중이며, 순차적으로 추가될
            예정입니다. 새로 추가되는 계산기는 각 카테고리 페이지에서
            확인하실 수 있습니다.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold text-brand-text">
          계산 결과는 참고용입니다
        </h2>
        <p className="text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          계산기 허브의 모든 계산 결과는 참고용 정보이며, 법적·재무적·의료적
          효력이 없습니다. 세율, 이자율, 건강 기준 등은 시점이나 개인 상황에
          따라 달라질 수 있으므로, 중요한 결정을 내리기 전에는 반드시 관련
          기관(고용노동부, 금융기관 등)의 공식 안내나 전문가(세무사, 노무사,
          의료진 등)의 확인을 거치시기 바랍니다. 각 계산기 페이지 하단에서
          계산 기준과 유의사항을 더 자세히 안내하고 있습니다.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold text-brand-text">운영진 소개</h2>
        <p className="text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          계산기 허브는 실생활에 필요한 계산기를 하나씩 직접 만들어가는
          소규모 팀이 운영하고 있습니다. 사용하시다가 계산 결과가 이상하거나
          개선했으면 하는 계산기가 있다면 언제든 알려주시기 바랍니다.
          여러분의 의견은 다음 계산기를 만드는 데 큰 도움이 됩니다.
        </p>
      </section>

      <div className="mt-10 rounded-xl border border-brand-border bg-brand-surface p-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-6">
        <p className="text-sm text-brand-text-secondary">
          계산기 허브에 대한 문의사항이나 계산 오류 제보는 문의 페이지를
          통해 남겨 주시기 바랍니다.
        </p>
        <Link
          href="/support#ask"
          className="mt-4 inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-brand-primary px-5 text-sm font-semibold text-brand-primary transition-colors hover:bg-blue-50 sm:mt-0"
        >
          문의하기
        </Link>
      </div>
    </div>
  );
}
