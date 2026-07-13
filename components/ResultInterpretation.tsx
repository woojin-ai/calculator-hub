export default function ResultInterpretation({ text }: { text: string }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xl font-bold text-brand-text">결과 해석</h2>
      <p className="text-pretty text-sm leading-relaxed text-brand-text-secondary sm:text-base">
        {text}
      </p>
    </section>
  );
}
