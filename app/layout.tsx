import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { buildSiteJsonLd } from "@/lib/site-jsonld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "계산기 허브 | 실생활에 필요한 계산기 모음",
  description:
    "만 나이, 연봉 실수령액, 대출 이자, D-Day 등 실생활에 필요한 계산기를 무료로 이용해 보세요.",
  verification: {
    google: "_YX3kbSeZq2clAsi9usIngHj7Q_4ScH4ywFCIpREnvQ",
    other: {
      "naver-site-verification": "663eea8148eba8249f384a4d853edc10506dc417",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Google AdSense 사이트 소유권 확인용 코드 스니펫.
          next/script(Script 컴포넌트)의 strategy="beforeInteractive"는 문서상
          "항상 <head>에 삽입"으로 보장되지만(node_modules/next/dist/docs/01-app/02-guides/scripts.md),
          실제 구현은 self.__next_s 큐에 push하는 인라인 스크립트를 <body> 최상단에 렌더링하고,
          실제 src를 가진 <script> 엘리먼트는 하이드레이션 이전 클라이언트 부트스트랩(app-bootstrap.js)이
          document.head에 동적으로 생성해 넣는 방식이라, 빌드 결과물의 원본 HTML(curl 등으로 보는 소스)에는
          Google이 준 스니펫이 그대로 나타나지 않고 <link rel="preload"> 힌트만 보인다(빌드로 직접 확인함).
          AdSense 소유권 확인 및 ads.txt와 마찬가지로 "정확한 원문 그대로 head에 존재"가 요구사항이므로,
          이 프로젝트가 이미 JSON-LD에 쓰는 것과 같은 방식(원문 <script> 태그를 직접 렌더링)을 그대로 따라
          next/script 대신 <head>에 원문 그대로 배치한다.
          (패턴 근거: node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
          의 "Themes" 예시 — 루트 레이아웃에 <head><script .../></head>를 직접 렌더링하는 공식 문서 패턴.)
        */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1237956887785232"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col bg-brand-bg text-brand-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildSiteJsonLd()).replace(/</g, "\\u003c"),
          }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
