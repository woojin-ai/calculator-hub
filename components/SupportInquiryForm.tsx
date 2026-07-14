"use client";

import { useState, type FormEvent } from "react";
import {
  INPUT_BASE as inputBase,
  TEXTAREA_BASE,
} from "@/lib/inputClass";

interface FieldErrors {
  email?: string;
  message?: string;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function SupportInquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    setStatus("submitting");
    setStatusMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setStatus("error");
        setStatusMessage(
          data?.error ?? "문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
        return;
      }

      setStatus("success");
      setStatusMessage(
        "문의가 접수되었습니다. 빠른 시일 내 답변드리겠습니다."
      );
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setStatusMessage("문의 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
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
          disabled={status === "submitting"}
          className={`${inputBase} border-brand-border disabled:opacity-60`}
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
          disabled={status === "submitting"}
          className={`${inputBase} ${
            errors.email ? "border-brand-warning" : "border-brand-border"
          } disabled:opacity-60`}
        />
        <p className="text-xs text-brand-text-secondary">
          답변드릴 때 참고할 수 있도록 문의 내용과 함께 전달됩니다.
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
          disabled={status === "submitting"}
          className={`${TEXTAREA_BASE} ${
            errors.message ? "border-brand-warning" : "border-brand-border"
          } disabled:opacity-60`}
        />
        {errors.message && (
          <p className="text-xs text-brand-warning" role="alert">
            {errors.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="h-12 w-full rounded-lg bg-brand-primary px-5 text-base font-semibold text-white transition-colors hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[180px]"
      >
        {status === "submitting" ? "전송 중..." : "질문 보내기"}
      </button>

      {status === "success" && (
        <p
          role="status"
          className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm text-brand-text"
        >
          {statusMessage}
        </p>
      )}

      {status === "error" && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 border border-brand-warning/30 p-3 text-sm text-brand-warning"
        >
          {statusMessage}
        </p>
      )}
    </form>
  );
}
