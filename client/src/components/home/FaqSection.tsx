const faqs = [
  {
    question: "Can I manage jobs, quotes and invoices in one place?",
    answer: "Yes. TradeLike keeps jobs, customers, quotes and invoice admin together so you are not jumping between spreadsheets and messages.",
  },
  {
    question: "Can I send invoices to customers quickly?",
    answer: "Yes. You can create invoices from jobs or accepted quotes, then manage sent, paid and overdue status from the invoice workspace.",
  },
  {
    question: "Does it work on mobile?",
    answer: "Yes. TradeLike is a mobile-friendly web app for owners, office staff and teams working between the office, van and site.",
  },
  {
    question: "Can my team use it?",
    answer: "Yes. Team plans and above include team scheduling and staff workspace features for assigning and managing work.",
  },
  {
    question: "What plan should I choose?",
    answer: "Solo is for one user, Team is for 2-10 users, Business adds inventory, custom reporting and API access, and Enterprise is for larger teams.",
  },
  {
    question: "Do I need technical knowledge?",
    answer: "No. TradeLike is designed for trade businesses that want clear job, customer, quote and invoice workflows without technical setup.",
  },
  {
    question: "How much admin time can it save?",
    answer: "Many trade teams can save around 2-6 admin hours a week by reducing repeated entry, scattered notes and missed follow-up.",
  },
  {
    question: "How do I contact support or sales?",
    answer: "Email support@tradelike.co.uk for support or sales@tradelike.co.uk for sales and Enterprise enquiries.",
  },
];

export default function FaqSection() {
  return (
    <section id="faq" className="bg-white px-5 py-16 text-slate-950 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Common questions from trade businesses</h2>
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
