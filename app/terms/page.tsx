import type { Metadata } from "next";
import LegalPageLayout, {
  type LegalSection,
} from "@/components/LegalPageLayout";
import { canonicalUrl } from "@/lib/site";

// 내부 기록용 메모(사이트 비노출, planning/terms-content.md 상단 HTML 주석 승계):
// 본 이용약관은 변호사 등 법률 전문가의 검토를 거치지 않은 표준 템플릿 기반 초안이다.
// 일반적인 무료 웹서비스 수준의 관행적 조항으로 구성되었으며, 실제 분쟁 발생 시 법적 효력 및
// 정확성을 보증하지 않는다. 사업 규모 확대, 유료화, 이용자 간 분쟁 발생 가능성 증가 시
// 정식 법률 검토를 받는 것을 권장한다. (기획팀, 2026-07-13)

export const metadata: Metadata = {
  title: "이용약관 | 계산기 허브",
  description:
    "계산기 허브 서비스 이용조건, 이용자의 권리·의무, 계산 결과 면책조항 등을 안내하는 이용약관입니다.",
  alternates: { canonical: canonicalUrl("/terms") },
};

const SECTIONS: LegalSection[] = [
  {
    id: "article-1",
    heading: "제1조 (목적)",
    body: (
      <p>
        본 약관은 계산기 허브(이하 &quot;사이트&quot;)가 제공하는 계산기 및
        관련 콘텐츠 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차,
        사이트와 이용자의 권리·의무 및 책임사항, 기타 필요한 사항을
        규정함을 목적으로 합니다.
      </p>
    ),
  },
  {
    id: "article-2",
    heading: "제2조 (정의)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          &quot;서비스&quot;란 사이트가 제공하는 만 나이, D-Day, BMI,
          대출이자 등 각종 생활 계산기 및 관련 정보 콘텐츠(블로그 포함)를
          의미합니다.
        </li>
        <li>
          &quot;이용자&quot;란 본 약관에 따라 사이트가 제공하는 서비스를
          이용하는 모든 자를 말합니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-3",
    heading: "제3조 (약관의 효력 및 변경)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>본 약관은 사이트에 게시함으로써 효력이 발생합니다.</li>
        <li>
          사이트는 관련 법령을 위반하지 않는 범위에서 필요 시 본 약관을
          개정할 수 있으며, 개정 시 적용일자 및 개정 사유를 명시하여 시행일
          이전에 사이트를 통해 공지합니다.
        </li>
        <li>
          이용자가 개정된 약관에 동의하지 않는 경우 서비스 이용을 중단할 수
          있으며, 개정약관 공지 후에도 서비스를 계속 이용하는 경우 약관
          변경에 동의한 것으로 간주합니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-4",
    heading: "제4조 (서비스의 내용)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          사이트는 별도의 회원가입 절차 없이 누구나 무료로 이용할 수 있는
          생활 밀착형 계산기(급여, 대출, 날짜, 생활 등) 및 관련 정보
          콘텐츠를 제공합니다.
        </li>
        <li>
          서비스의 세부 내용(제공 계산기 종류 등)은 사이트 사정에 따라
          예고 없이 추가, 변경될 수 있습니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-5",
    heading: "제5조 (이용자의 의무)",
    body: (
      <div className="flex flex-col gap-2">
        <p>
          이용자는 서비스 이용 시 다음 각 호의 행위를 하여서는 안 됩니다.
        </p>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            사이트가 제공하는 콘텐츠(계산 로직, 텍스트, 디자인 등)를
            사이트의 사전 동의 없이 복제, 배포, 전송, 2차적저작물 작성 등의
            방법으로 이용하는 행위
          </li>
          <li>
            자동화된 수단(크롤러, 봇 등)을 이용하여 비정상적으로 서비스에
            접근하거나 서버에 과도한 부하를 유발하는 행위
          </li>
          <li>
            광고를 부정한 방법으로 클릭하거나 광고 게재 방식에 부당하게
            개입하는 행위
          </li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>관련 법령 및 공서양속에 위반되는 행위</li>
        </ol>
      </div>
    ),
  },
  {
    id: "article-6",
    heading: "제6조 (계산 결과에 대한 면책)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          사이트가 제공하는 모든 계산 결과는 이용자가 입력한 값을 바탕으로
          제공되는 참고용 정보이며, 법적, 재무적, 의료적 효력이나 구속력을
          가지지 않습니다.
        </li>
        <li>
          계산에 사용되는 세율, 이자율, 건강 기준 등의 기준값은 관련
          제도·정책의 변경이나 개인별 상황에 따라 실제 결과와 차이가 있을
          수 있습니다.
        </li>
        <li>
          이용자는 계산 결과를 바탕으로 한 중요한 의사결정을 내리기 전
          반드시 관련 기관의 공식 안내 또는 관련 분야 전문가(세무사,
          노무사, 금융기관, 의료진 등)의 확인을 거쳐야 하며, 계산 결과만을
          근거로 판단하여 발생한 손해에 대해 사이트는 책임을 지지 않습니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-7",
    heading: "제7조 (서비스 제공의 중단 및 변경)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          사이트는 시스템 점검, 서비스 개선, 천재지변, 기타 불가항력적
          사유가 있는 경우 서비스 제공을 일시적으로 중단할 수 있습니다.
        </li>
        <li>
          사이트는 운영상, 기술상의 필요에 따라 제공하는 서비스의 전부 또는
          일부를 변경하거나 종료할 수 있으며, 이 경우 가능한 사전에
          공지합니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-8",
    heading: "제8조 (지식재산권)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          사이트가 제작한 콘텐츠(계산 로직, 텍스트, 디자인, 로고 등)에 대한
          저작권 및 기타 지식재산권은 사이트 운영자에게 귀속됩니다.
        </li>
        <li>
          이용자는 사이트를 이용함으로써 얻은 정보를 사이트의 사전 동의
          없이 복제, 송신, 출판, 배포, 방송 등의 방법으로 영리 목적으로
          이용하거나 제3자에게 이용하게 할 수 없습니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-9",
    heading: "제9조 (광고 게재)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          사이트는 무료 서비스 운영을 위해 Google AdSense 등 제3자 광고
          네트워크를 통해 광고를 게재할 수 있습니다.
        </li>
        <li>
          광고에 게재된 상품이나 서비스의 내용, 품질 등에 대한 책임은
          원칙적으로 해당 광고주 및 광고 네트워크에 있으며, 사이트는
          이용자와 광고주 간의 거래에 관여하지 않습니다.
        </li>
        <li>
          광고 게재 관련 쿠키 등 개인정보 처리에 대한 내용은
          개인정보처리방침을 따릅니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-10",
    heading: "제10조 (책임의 한계)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          사이트는 천재지변, 불가항력, 이용자의 귀책사유로 인해 발생한
          서비스 장애에 대해 책임을 지지 않습니다.
        </li>
        <li>
          사이트는 서비스에 게재된 정보의 신뢰도, 정확성 등을 보증하지
          않으며, 이용자가 서비스를 이용하여 기대하는 효과를 얻지 못한
          것에 대해 책임을 지지 않습니다(제6조 면책조항 참조).
        </li>
        <li>
          사이트는 이용자 상호간 또는 이용자와 제3자 간에 서비스를 매개로
          발생한 분쟁에 개입할 의무가 없으며, 이로 인한 손해를 배상할
          책임이 없습니다.
        </li>
      </ol>
    ),
  },
  {
    id: "article-11",
    heading: "제11조 (준거법 및 관할)",
    body: (
      <ol className="list-inside list-decimal space-y-1">
        <li>
          본 약관과 관련하여 사이트와 이용자 간 분쟁이 발생할 경우 대한민국
          법령을 준거법으로 합니다.
        </li>
        <li>
          본 약관과 관련한 분쟁에 대한 소송은 민사소송법상의 관할법원에
          제기합니다.
        </li>
      </ol>
    ),
  },
  {
    id: "addendum",
    heading: "부칙",
    body: <p>본 약관은 2026년 7월 13일부터 시행합니다.</p>,
  },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="이용약관"
      effectiveDateLabel="시행일자 2026년 7월 13일"
      sections={SECTIONS}
    />
  );
}
