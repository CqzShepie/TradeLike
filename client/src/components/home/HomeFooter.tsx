import Logo from "../layout/Logo";

const emails = [
  "hello@tradelike.co.uk",
  "support@tradelike.co.uk",
  "sales@tradelike.co.uk",
];

export default function HomeFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-5 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo tone="dark" />
          <p className="mt-2 max-w-xl">
            TradeLike Ltd. Job, quote, invoice and scheduling software for UK trade businesses.
          </p>
        </div>

        <nav aria-label="Footer contact" className="flex flex-wrap gap-4">
          {emails.map(email => (
            <a
              key={email}
              href={`mailto:${email}`}
              className="font-semibold text-slate-300 transition hover:text-white focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-300"
            >
              {email}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
