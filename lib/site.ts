/** 배포 사이트 기준 URL (sitemap.ts, robots.ts 등에서 공통으로 사용) */
export const SITE_URL = "https://calculator-hub-delta.vercel.app";

/**
 * 자기참조 canonical URL을 만든다 (GSC 감사 07-20 결함 수정).
 * - 트레일링 슬래시를 붙이지 않는다. 홈("/")만 예외적으로 SITE_URL 그대로 반환한다.
 * - 프리뷰 배포가 색인되지 않도록 VERCEL_URL 등 동적 호스트를 쓰지 않고 SITE_URL을 고정 사용한다.
 */
export function canonicalUrl(path: string): string {
  if (!path || path === "/") return SITE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized.replace(/\/+$/, "")}`;
}
