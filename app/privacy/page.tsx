import type { Metadata } from "next";
import LegalPageLayout, {
  type LegalSection,
} from "@/components/LegalPageLayout";
import { canonicalUrl } from "@/lib/site";

// 내부 기록용 메모(사이트 비노출, planning/privacy-policy-content.md 상단 HTML 주석 승계):
// 본 개인정보처리방침은 변호사 등 법률 전문가의 검토를 거치지 않은 표준 템플릿 기반 초안이다.
// 일반적인 개인/소규모 프로젝트 수준의 관행적 문구로 작성되었으며, 실제 법적 리스크(개인정보보호법 등)에
// 대한 정확성을 보증하지 않는다. 사업 규모 확대, 회원가입 기능 도입, 유료화, 대량 트래픽 발생 등
// 상황 변화 시 정식 법률 검토를 다시 받는 것을 권장한다. (기획팀, 2026-07-13)

export const metadata: Metadata = {
  title: "개인정보처리방침 | 계산기 허브",
  description:
    "계산기 허브의 개인정보 수집·이용·보관 및 쿠키, 광고 게재와 관련된 개인정보처리방침을 안내합니다.",
  alternates: { canonical: canonicalUrl("/privacy") },
};

const SECTIONS: LegalSection[] = [
  {
    id: "collected-info",
    heading: "1. 수집하는 개인정보 항목 및 수집 방법",
    body: (
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-semibold text-brand-text">가. 계산기 이용 시</p>
          <p className="mt-1">
            사이트가 제공하는 만 나이, D-Day, BMI, 대출이자 등 각 계산기에
            입력하시는 값(예: 생년월일, 신장·체중, 대출원금·금리·기간 등)은
            이용자의 브라우저(기기) 내에서만 계산 처리되며, 사이트 서버로
            전송되거나 저장되지 않습니다.
          </p>
        </div>
        <div>
          <p className="font-semibold text-brand-text">
            나. 사이트 이용 과정에서 자동으로 수집되는 정보
          </p>
          <p className="mt-1">
            접속 IP 주소, 방문 일시, 브라우저 및 기기 정보, 방문 페이지 기록
            등이 방문 통계 분석 도구를 통해 자동으로 수집될 수 있습니다.
          </p>
        </div>
        <div>
          <p className="font-semibold text-brand-text">
            다. 광고 게재 관련 정보
          </p>
          <p className="mt-1">
            사이트는 Google AdSense를 통해 광고를 게재하며, 이 과정에서
            Google 및 광고 네트워크가 쿠키, 광고 식별자 등을 통해 이용자의
            관심사 기반 정보를 수집할 수 있습니다.
          </p>
        </div>
        <div>
          <p className="font-semibold text-brand-text">
            라. 고객센터 문의 시
          </p>
          <p className="mt-1">
            고객센터(/support) &quot;질문하기&quot;를 통해 문의하시는 경우,
            회신을 위해 이름(또는 닉네임), 이메일 주소, 문의 내용이 이메일
            형태로 수집됩니다. 별도의 데이터베이스에 저장되지 않고 문의 처리를
            위한 이메일함에서만 관리됩니다.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "purpose",
    heading: "2. 개인정보의 수집 목적",
    body: (
      <ul className="list-inside list-disc space-y-1">
        <li>계산기 등 사이트 서비스 제공 및 운영</li>
        <li>방문 통계 분석을 통한 서비스 품질 개선</li>
        <li>Google AdSense를 통한 광고 게재(맞춤형 광고 포함)</li>
        <li>문의 접수 및 답변</li>
      </ul>
    ),
  },
  {
    id: "retention-period",
    heading: "3. 개인정보의 보유 및 이용 기간",
    body: (
      <ul className="list-inside list-disc space-y-1">
        <li>
          계산기 입력값: 서버에 저장하지 않으므로 별도의 보유기간이
          존재하지 않으며, 브라우저 새로고침·종료 시 소멸됩니다.
        </li>
        <li>
          고객센터 문의 이메일: 문의 처리 목적이 달성된 후 합리적인 기간 내에
          파기하며, 별도 데이터베이스에 보관하지 않습니다.
        </li>
        <li>
          방문 로그 및 쿠키: 각 서비스(방문 통계 분석 도구, Google AdSense)의
          자체 보유기간 정책을 따릅니다.
        </li>
      </ul>
    ),
  },
  {
    id: "third-party-cookies",
    heading: "4. 개인정보의 제3자 제공 및 쿠키 안내",
    body: (
      <div className="flex flex-col gap-3">
        <p>
          사이트는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
          다만, 아래와 같이 제3자 서비스를 이용하고 있으며 이 과정에서 쿠키를
          통한 정보 수집이 발생할 수 있습니다.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="font-semibold text-brand-text">
              Google AdSense
            </strong>
            : 광고 게재를 위해 쿠키 및 광고 식별자를 사용하여 이용자의
            관심사에 기반한 맞춤형 광고를 제공할 수 있습니다.
          </li>
          <li>
            <strong className="font-semibold text-brand-text">
              방문 통계 분석 도구(예: Google Analytics 등)
            </strong>
            : 방문자 수, 유입 경로, 이용 패턴 분석을 위해 쿠키를 사용할 수
            있습니다.
          </li>
        </ul>
        <p>
          Google을 비롯한 제3자 공급업체는 쿠키를 사용하여 이용자가 본
          사이트 및 다른 사이트를 방문한 기록을 바탕으로 광고를 게재할 수
          있습니다. Google의 개인정보처리방침은{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary underline underline-offset-2"
          >
            https://policies.google.com/privacy
          </a>
          에서 확인하실 수 있습니다.
        </p>
        <p>
          이용자는 아래 경로를 통해 맞춤형 광고 수신을 원하지 않을 경우 설정을
          변경할 수 있습니다.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Google 광고 설정:{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary underline underline-offset-2"
            >
              https://adssettings.google.com
            </a>
          </li>
          <li>
            온라인 맞춤형 광고 선택 관리:{" "}
            <a
              href="https://www.aboutads.info/choices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary underline underline-offset-2"
            >
              https://www.aboutads.info/choices
            </a>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "cookie-operation",
    heading: "5. 쿠키(Cookie)의 운영 및 거부",
    body: (
      <p>
        쿠키란 웹사이트 운영에 이용되는 서버가 이용자의 브라우저에 전송하는
        소량의 정보입니다. 사이트는 광고 게재 및 방문 통계 분석을 위해 쿠키를
        사용할 수 있습니다. 이용자는 웹브라우저 설정을 통해 쿠키 저장을
        거부하거나 이미 저장된 쿠키를 삭제할 수 있습니다. 다만 쿠키 저장을
        거부할 경우 일부 서비스(맞춤형 광고 등) 이용에 제한이 있을 수
        있습니다.
      </p>
    ),
  },
  {
    id: "user-rights",
    heading: "6. 이용자의 권리",
    body: (
      <p>
        이용자는 언제든지 사이트가 보유한 자신의 개인정보(예: 고객센터 문의
        시 제공한 이메일 등)에 대해 열람, 정정, 삭제를 요청할 수 있으며,
        아래 문의처로 연락 주시면 지체 없이 조치하겠습니다. 계산기 입력값은
        애초에 저장되지 않으므로 별도의 열람·삭제 절차가 필요하지 않습니다.
      </p>
    ),
  },
  {
    id: "security-measures",
    heading: "7. 개인정보의 안전성 확보조치",
    body: (
      <p>
        사이트는 별도의 회원 데이터베이스를 운영하지 않으며, 고객센터 문의를
        통해 수집되는 최소한의 정보만 이메일 형태로 처리합니다. 개인정보가
        분실, 도난, 유출, 변조되지 않도록 합리적인 수준의 주의를 기울입니다.
      </p>
    ),
  },
  {
    id: "privacy-officer",
    heading: "8. 개인정보 보호책임자 및 문의처",
    body: (
      <p>
        개인정보 관련 문의, 열람·정정·삭제 요청은{" "}
        <a
          href="/support#ask"
          className="text-brand-primary underline underline-offset-2"
        >
          고객센터 문의하기(/support#ask)
        </a>
        를 통해 연락해 주시기 바랍니다.
      </p>
    ),
  },
  {
    id: "notice-obligation",
    heading: "9. 고지의 의무",
    body: (
      <div className="flex flex-col gap-2">
        <p>
          이 개인정보처리방침은 관련 법령, 정책 또는 사이트 운영 방침 변경에
          따라 수정될 수 있으며, 내용이 변경되는 경우 본 페이지를 통해
          고지합니다.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>시행일자: 2026년 7월 13일</li>
        </ul>
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="개인정보처리방침"
      effectiveDateLabel="시행일자 2026년 7월 13일"
      intro={
        <p>
          계산기 허브(이하 &quot;사이트&quot;)는 이용자의 개인정보를
          소중하게 생각하며, 아래와 같이 개인정보처리방침을 안내합니다.
          사이트는 별도의 회원가입 절차가 없으며, 계산기에 입력하시는 값은
          원칙적으로 서버에 저장되지 않습니다.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
