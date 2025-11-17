export function money(amountCents: number, currency = "GBP") {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format((amountCents || 0) / 100);
  }
  