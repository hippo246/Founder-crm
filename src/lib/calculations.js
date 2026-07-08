// ─── Financial calculations ───────────────────────────────────────────────────

export const calcInvoiceTotal = (amount, taxPct, discount) => {
  const amt = Number(amount) || 0;
  const tax = Number(taxPct) || 0;
  const disc = Number(discount) || 0;
  return amt + (amt * tax / 100) - disc;
};

export const calcProjectFinancials = (budget, paid) => {
  const b = Number(budget) || 0;
  const p = Number(paid) || 0;
  return { budget: b, paid: p, pending: Math.max(0, b - p) };
};

export const sumField = (arr, field) =>
  (arr || []).reduce((acc, item) => acc + (Number(item[field]) || 0), 0);

export const pct = (part, total) =>
  total > 0 ? Math.round((part / total) * 100) : 0;
