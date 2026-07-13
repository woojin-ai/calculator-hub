"use client";

import { useState, type FormEvent } from "react";

/** 마스터 확정 대체 수신 이메일 (design/support-page-ui-spec.md 5-3, planning/support-page-content.md) */
const SUPPORT_EMAIL = "sss159228@gmail.com";

const inputBase =
  "h-12 rounded-lg border px-4 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15";

interface FieldErrors {
  email?: string;
  message?: string;
}

export default function SupportInquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!email.trim()) {
      nextErrors.email = "답장받으실 이메일을 입력해주세요.";
    }
    if (!message.trim()) {
      nextErrors.message = "문의 내용을 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    const subject = "[계산기 허브 문의]";
    const body = [
      `이름(또는 닉네임): ${name.trim() || "(미입력)"}`,
      `회신 받으실 이메일: ${email.trim()}`,
      "문의 내용:",
      message.trim(),
    ].join("\n");

    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-sm font-medium text-brand-text-secondary"
        >
          이름 (선택)
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="홍길동"
          className={`${inputBase} border-brand-border`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-brand-text-secondary"
        >
          답장받으실 이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@email.com"
          aria-invalid={errors.email ? true : undefined}
          className={`${inputBase} ${
            errors.email ? "border-brand-warning" : "border-brand-border"
          }`}
        />
        <p className="text-xs text-brand-text-secondary">
          메일 본문에 자동으로 포함되어 답변 시 참고됩니다.
        </p>
        {errors.email && (
          <p className="text-xs text-brand-warning" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="message"
          className="text-sm font-medium text-brand-text-secondary"
        >
          문의 내용
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="사용하신 계산기 이름, 입력한 값, 문의 내용을 자세히 적어주시면 빠르게 확인할 수 있습니다."
          aria-invalid={errors.message ? true : undefined}
          className={`min-h-[140px] rounded-lg border px-4 py-3 text-base text-brand-text outline-none transition-colors focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15 ${
            errors.message ? "border-brand-warning" : "border-brand-border"
          }`}
        />
        {errors.message && (
          <p className="text-xs text-brand-warning" role="alert">
            {errors.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover sm:w-auto sm:min-w-[180px]"
      >
        질문 보내기
      </button>

      <p className="text-xs text-brand-text-secondary">
        메일 작성 화면이 열리지 않는다면 {SUPPORT_EMAIL}로 직접
        문의해주세요.
      </p>
    </form>
  );
}
