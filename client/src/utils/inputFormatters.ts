const gbCurrencyFormatter = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export function digitsOnly(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatPhone(value: string | null | undefined) {
  const digits = digitsOnly(value).slice(0, 11);
  return digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
}

export function isValidOptionalUkPhone(value: string | null | undefined) {
  const length = digitsOnly(value).length;
  return length === 0 || length === 11;
}

export function formatSortCode(value: string | null | undefined) {
  const digits = digitsOnly(value).slice(0, 6);
  return digits.replace(/(\d{2})(?=\d)/g, "$1-").replace(/-$/, "");
}

export function formatCurrency(value: number | string | null | undefined) {
  return gbCurrencyFormatter.format(Number(value || 0));
}

export function formatShortDate(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatLongDate(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "No date recorded";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-GB");
}

export function toDateTimeLocalValue(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
