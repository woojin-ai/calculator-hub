import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "사이트 소개" },
  { href: "/support#ask", label: "문의하기" },
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "이용약관" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-brand-surface">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-brand-text-secondary sm:px-6">
        <nav className="flex flex-wrap gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 transition-colors hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-2">© {new Date().getFullYear()} 계산기 허브. 모든 계산 결과는 참고용이며, 법적·재무적 판단의 근거로 사용할 수 없습니다.</p>
      </div>
    </footer>
  );
}
