"use client";

import { useState, type FormEvent } from "react";
import {
  BMI_STATUS_LABEL,
  calculateBmi,
  type BmiResult,
  type BmiStatus,
} from "@/lib/bmi";
import { INPUT_BASE } from "@/lib/inputClass";

const STATUS_STYLES: Record<
  BmiStatus,
  {
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  underweight: {
    border: "border-brand-warning",
    bg: "bg-gradient-to-br from-amber-50 to-white",
    text: "text-brand-warning",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  normal: {
    border: "border-brand-accent",
    bg: "bg-gradient-to-br from-emerald-50 to-white",
    text: "text-brand-accent",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
  overweight: {
    border: "border-brand-warning",
    bg: "bg-gradient-to-br from-amber-50 to-white",
    text: "text-brand-warning",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  obese: {
    border: "border-brand-danger",
    bg: "bg-gradient-to-br from-red-50 to-white",
    text: "text-brand-danger",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
  },
};

export default function BmiCalculator() {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<BmiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const heightValue = Number(height);
    const weightValue = Number(weight);

    if (!height || !weight) {
      setError("키와 몸무게를 모두 입력해주세요.");
      setResult(null);
      return;
    }

    const calculated = calculateBmi(heightValue, weightValue);

    if (!calculated) {
      setError("올바른 키와 몸무게인지 확인해주세요.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(calculated);
  }

  const style = result ? STATUS_STYLES[result.status] : null;

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="height"
              className="text-sm font-medium text-brand-text-secondary"
            >
              키 (cm)
            </label>
            <input
              id="height"
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              placeholder="170"
              className={`${INPUT_BASE} ${
                error ? "border-brand-warning" : "border-brand-border"
              }`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="weight"
              className="text-sm font-medium text-brand-text-secondary"
            >
              몸무게 (kg)
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="65"
              className={`${INPUT_BASE} ${
                error ? "border-brand-warning" : "border-brand-border"
              }`}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-brand-warning" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover"
        >
          BMI 계산하기
        </button>
      </form>

      {result && style && (
        <div
          className={`mt-6 rounded-xl border-l-4 p-4 transition-colors duration-200 sm:p-6 ${style.border} ${style.bg}`}
        >
          <p className="text-sm font-medium text-brand-text-secondary">
            회원님의 BMI 지수
          </p>
          <p
            className={`mt-1 flex items-baseline gap-2 tabular-nums text-4xl font-bold sm:text-[2.5rem] ${style.text}`}
          >
            {result.bmi}
            <span className="text-base font-medium text-brand-text-secondary">
              kg/m²
            </span>
          </p>
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold ${style.badgeBg} ${style.badgeText}`}
          >
            {BMI_STATUS_LABEL[result.status]}
          </span>
          <p className="mt-2 text-sm text-brand-text-secondary">
            {getResultSummary(height, weight, result)}
          </p>
        </div>
      )}
    </div>
  );
}

function getResultSummary(
  height: string,
  weight: string,
  result: BmiResult
): string {
  return `입력하신 키 ${height}cm, 몸무게 ${weight}kg 기준으로 BMI(체질량지수)는 ${result.bmi}이며, '${BMI_STATUS_LABEL[result.status]}' 구간에 해당합니다.`;
}
