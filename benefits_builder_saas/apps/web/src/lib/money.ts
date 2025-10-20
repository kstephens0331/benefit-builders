export const toCents = (n: number) => Math.round((n ?? 0) * 100);
export const fromCents = (c: number) => +(Number(c ?? 0) / 100).toFixed(2);
export const fmtUSD = (cents: number) =>
  new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(fromCents(cents));
