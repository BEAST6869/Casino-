export function formatNumberIntl(n: number, opts?: { locale?: string; maximumFractionDigits?: number }) {
  const locale = opts?.locale ?? "en-US";
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 0;
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n);
}