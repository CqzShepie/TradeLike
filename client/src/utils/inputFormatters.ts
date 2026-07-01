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
