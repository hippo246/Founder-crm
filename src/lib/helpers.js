// ─── General utility helpers ──────────────────────────────────────────────────

let globalDateFormat = "DD/MM/YYYY";

export const setGlobalDateFormat = (format) => {
  globalDateFormat = format;
};

export const getGlobalDateFormat = () => globalDateFormat;

export const genId = () => Math.random().toString(36).slice(2, 10);

export const fmtDate = (d, format = null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  
  const dateFormat = format || globalDateFormat;
  const day = String(dt.getDate()).padStart(2, '0');
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const year = dt.getFullYear();
  
  if (dateFormat === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  } else if (dateFormat === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  } else if (dateFormat === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }
  
  // Default to locale format
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtCurrency = (n, currency = "INR") => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(num);
};

export const isOverdue = (dateStr) =>
  dateStr &&
  new Date(dateStr) < new Date() &&
  new Date(dateStr).toDateString() !== new Date().toDateString();

export const isToday = (dateStr) =>
  dateStr && new Date(dateStr).toDateString() === new Date().toDateString();

export const clamp = (val, min = 0, max = 100) => Math.min(max, Math.max(min, val));

export const calculateDaysBetween = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2 - d1;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Safe display helpers to prevent [object Object] rendering
export function safeText(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : fallback;
    }
    return fallback;
  }
  return String(value);
}

export function safeMoney(value, currency = "INR", fallback = "0.00") {
  const num = Number(value);
  if (isNaN(num)) return fallback;
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${num.toFixed(2)}`;
}

export function safeDate(value, fallback = "—") {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString().slice(0, 10);
  } catch {
    return fallback;
  }
}

export function safeLabel(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(", ") : fallback;
    }
    return fallback;
  }
  return String(value);
}

// ─── Phase 17: Date system helpers ───────────────────────────────────────────

/** Returns today as YYYY-MM-DD */
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Add N days to a date string, returns YYYY-MM-DD */
export const addDays = (dateStr, days) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d)) return todayISO();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Format date using the workspace date format setting */
export const formatDateBySettings = (dateStr, settings = {}) => {
  return fmtDate(dateStr, settings.dateFormat || globalDateFormat);
};

/** Returns true if the date is in the past (not including today) */
export const isOverdueFn = (dateStr) =>
  dateStr && new Date(dateStr) < new Date() && !isToday(dateStr);

/** Returns true if the date is due within N days (including today) */
export const isDueSoon = (dateStr, days = 3) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const soon = new Date(Date.now() + days * 86400000);
  return d >= now && d <= soon;
};

/** Returns true if date is today */
export const isDueToday = (dateStr) => isToday(dateStr);

/** Safely normalize a date value to YYYY-MM-DD or return "" */
export const normalizeDate = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
};

/** Check if a date is in the current week */
export const isThisWeek = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
};

/** Check if a date is in the current month */
export const isThisMonth = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};
