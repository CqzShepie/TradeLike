export default function Currency({ valuePence, currency = "GBP" }: { valuePence: number | null | undefined; currency?: string }) {
  if (valuePence == null) {
    return <span>Contact Sales</span>;
  }

  const hasPence = valuePence % 100 !== 0;

  return (
    <span>
      {new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        minimumFractionDigits: hasPence ? 2 : 0,
        maximumFractionDigits: hasPence ? 2 : 0,
      }).format(valuePence / 100)}
    </span>
  );
}
