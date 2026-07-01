const faqs = [
  {
    question: "Is TradeLike only for one trade?",
    answer: "No. TradeLike is designed for UK trade businesses including plumbing, heating, electrical, building, maintenance and service teams.",
  },
  {
    question: "Can I manage engineers?",
    answer: "Yes. You can organise jobs around engineers, see workload and keep the team clear on what is booked next.",
  },
  {
    question: "Can I create quotes?",
    answer: "Yes. TradeLike supports customer quotes with line items, VAT, discounts and accepted quote conversion into jobs.",
  },
  {
    question: "Do I need a card to start?",
    answer: "No card required to create your account. The signup form only needs your business name, email and password.",
  },
  {
    question: "Is this for UK businesses?",
    answer: "Yes. The product language, VAT workflow and trade examples are built around UK trade businesses.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="bg-white px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Common questions</h2>
        </div>

        <div className="mt-10 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50">
          {faqs.map(faq => (
            <details key={faq.question} className="group p-5">
              <summary className="cursor-pointer list-none text-base font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span className="text-sm font-bold text-blue-700 group-open:hidden">Open</span>
                  <span className="hidden text-sm font-bold text-blue-700 group-open:inline">Close</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
