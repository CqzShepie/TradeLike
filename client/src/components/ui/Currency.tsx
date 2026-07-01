export default function Currency({ valuePence, currency = "GBP" }: { valuePence: number | null | undefined; currency?: string }) {
  if (valuePence == null) {
    return <span>Contact us</span>;
  }

  return (
    <span>
      {new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(valuePence / 100)}
    </span>
  );
}
