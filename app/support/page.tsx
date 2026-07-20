import type { Metadata } from "next";
import type { FaqItem } from "@/lib/calculators";
import FaqAccordion from "@/components/FaqAccordion";
import SupportInquiryForm from "@/components/SupportInquiryForm";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "고객센터 | 계산기 허브",
  description:
    "계산기 허브 이용 중 궁금한 점을 자주 묻는 질문에서 확인하고, 원하는 답을 찾지 못했다면 질문을 남겨보세요.",
  alternates: { canonical: canonicalUrl("/support") },
};

// 콘텐츠 출처: planning/support-page-content.md (기획팀, 2026-07-13)
const SUPPORT_FAQS: FaqItem[] = [
  {
    question: "계산 결과를 100% 신뢰할 수 있나요?",
    answer:
      "계산기 허브의 모든 계산기는 참고용 도구입니다. 입력하신 값을 기준으로 결과를 계산해 보여드리지만, 세율·이자율·건강 기준 등은 시점이나 개인 상황에 따라 달라질 수 있습니다. 법적·재무적·의료적 의사결정을 내리기 전에는 반드시 관련 기관의 공식 안내나 전문가(세무사, 노무사, 금융기관, 의료진 등)의 확인을 거치시기 바랍니다.",
  },
  {
    question: "계산 결과가 틀린 것 같습니다. 어떻게 알려야 하나요?",
    answer:
      "아래 \"질문하기\"를 통해 (1) 사용하신 계산기 이름, (2) 입력하신 값, (3) 화면에 표시된 결과를 함께 알려주시면 빠르게 확인 후 조치하겠습니다.",
  },
  {
    question: "회원가입이 필요한가요?",
    answer: "아니요. 계산기 허브는 회원가입 없이 누구나 무료로 이용하실 수 있습니다.",
  },
  {
    question:
      "계산기에 입력한 정보(생년월일, 소득, 대출 정보 등)가 서버에 저장되나요?",
    answer:
      "아니요. 계산기에 입력하시는 값은 이용자의 브라우저 안에서만 계산되며 사이트 서버로 전송되거나 저장되지 않습니다. \"질문하기\"를 통해 문의하실 때 남기시는 이름·이메일·문의 내용만 답변을 위해 이메일로 전달됩니다. 자세한 내용은 개인정보처리방침 페이지에서 확인하실 수 있습니다.",
  },
  {
    question: "광고가 너무 많이 보이거나 불편한 광고가 있어요.",
    answer:
      "이용에 불편을 드려 죄송합니다. 사이트는 Google AdSense를 통해 광고를 게재하고 있으며, 무료 서비스 운영을 위한 재원으로 사용됩니다. 특정 광고에 문제가 있다면 \"질문하기\"로 알려주시면 확인해 보겠습니다.",
  },
  {
    question: "지금 이용할 수 있는 계산기는 어떤 것들이 있나요?",
    answer:
      "현재 만 나이 계산기, D-Day 계산기, BMI 계산기, 대출이자 계산기 4종을 바로 이용하실 수 있습니다. 급여·생활 카테고리 계산기는 순차적으로 추가되고 있으며, 새로 추가되는 계산기는 각 카테고리 페이지에서 확인하실 수 있습니다.",
  },
  {
    question: "새로운 계산기를 추가해 줄 수 있나요?",
    answer:
      "좋은 제안 감사합니다. \"질문하기\"로 원하시는 계산기 종류를 알려주시면 검토 후 반영을 고려하겠습니다.",
  },
  {
    question: "오류나 버그를 신고했는데 언제 반영되나요?",
    answer:
      "신고해 주신 내용은 담당자에게 전달되며, 확인 및 수정에는 사안에 따라 시간이 걸릴 수 있습니다. 반영 완료 시 별도로 안내드리지는 않으니, 궁금하시면 다시 문의해 주시면 진행 상황을 확인해 드리겠습니다.",
  },
  {
    question: "모바일에서도 사용할 수 있나요?",
    answer:
      "네, 모바일과 데스크톱 모두에서 이용하실 수 있도록 반응형으로 제공되고 있습니다.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-brand-text sm:text-[2rem]">
          고객센터
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          계산기 허브를 이용해 주셔서 감사합니다. 계산기 이용 중 궁금한 점은
          아래 자주 묻는 질문에서 먼저 확인해 보시기 바랍니다. 원하는 답을
          찾지 못하셨다면 하단 &quot;질문하기&quot;를 통해 언제든 문의해
          주세요.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          사이트는 별도의 상담원 채팅이나 자동 응답 시스템 없이, 담당자가
          이메일로 직접 확인하고 답변드리는 방식으로 운영되고 있습니다.
          문의량에 따라 답변까지 다소 시간이 걸릴 수 있는 점 양해
          부탁드립니다.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
          <a
            href="#faq"
            className="rounded-full border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            자주 묻는 질문 보기 ↓
          </a>
          <a
            href="#ask"
            className="rounded-full border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary"
          >
            바로 질문하기 →
          </a>
        </div>
      </section>

      <div id="faq">
        <FaqAccordion items={SUPPORT_FAQS} />
      </div>

      <section id="ask" className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-brand-text">질문하기</h2>
        <p className="mb-4 text-sm leading-relaxed text-brand-text-secondary sm:text-base">
          원하시는 답을 찾지 못하셨다면 아래 내용을 알려주세요. 계산 오류를
          제보하실 경우 계산기 이름, 입력하신 값, 화면에 표시된 결과를
          함께 적어주시면 확인이 훨씬 빨라집니다.
        </p>

        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-relaxed text-brand-text-secondary">
          질문 보내기 버튼을 누르면 입력하신 내용이 담긴 이메일 작성 화면이
          열립니다. 평소 사용하시는 메일 앱(또는 웹메일)이 설정되어 있어야
          하며, 열린 화면에서 마지막으로 [보내기]를 눌러야 문의가 실제로
          접수됩니다.
        </div>

        <SupportInquiryForm />
      </section>
    </div>
  );
}
