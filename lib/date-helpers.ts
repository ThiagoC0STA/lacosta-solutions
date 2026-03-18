import type { DueStatus } from "@/types";
import {
  addMonths,
  differenceInDays,
  format,
  parse,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

/**
 * Convert "YYYY-MM-DD" string to Date at local midnight.
 * new Date("2026-03-19") treats as UTC midnight → shows 18 in Brazil (UTC-3).
 * This avoids that -1 day timezone bug.
 */
export function toLocalDate(date: Date | string): Date {
  if (typeof date !== "string") return date;
  const iso = date.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(date);
}

export function formatDate(date: Date | string): string {
  const dateObj = toLocalDate(date);
  return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
}

export function parseDate(dateStr: string): Date | null {
  const currentYear = new Date().getFullYear();

  // Helper to determine century for 2-digit years intelligently
  // If year is > current year's last 2 digits + threshold, assume previous century
  const getFullYear = (twoDigitYear: number): number => {
    const currentLastTwoDigits = currentYear % 100;
    // If the 2-digit year is more than 10 years ahead of current year's last 2 digits,
    // it's likely from the 1900s (e.g., 79 -> 1979, not 2079)
    if (twoDigitYear > currentLastTwoDigits + 10) {
      return 1900 + twoDigitYear;
    } else {
      // Otherwise, assume 2000s (e.g., 26 -> 2026)
      return 2000 + twoDigitYear;
    }
  };

  // Brazil-first date formats (dd/MM is standard)
  // US formats (MM/dd) as fallback - Excel often exports dates as M/d/yy when locale is US
  const formats = [
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "dd.MM.yyyy",
    "yyyy-MM-dd",
    "dd/MM/yy",
    "dd-MM-yy",
    "MM/dd/yyyy",
    "M/d/yyyy",
    "MM/dd/yy",
    "M/d/yy",
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (!isNaN(parsed.getTime())) {
        // Fix 2-digit years intelligently
        if (parsed.getFullYear() < 100) {
          const twoDigitYear = parsed.getFullYear();
          parsed.setFullYear(getFullYear(twoDigitYear));
        }
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Try parsing with manual 2-digit year fix (Brazil: dd/MM/yy)
  // Handle formats like "26/01/26" or "01/01/26" or "06/06/79"
  const twoDigitYearMatch = dateStr.match(
    /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})$/,
  );
  if (twoDigitYearMatch) {
    const [, day, month, year] = twoDigitYearMatch; // Brazil: day/month/year
    const twoDigitYear = parseInt(year, 10);
    const fullYear = getFullYear(twoDigitYear);
    const date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try native Date parsing - CAREFUL: ISO (yyyy-MM-dd) works; dd/mm can be parsed as mm/dd by browser
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) {
    const native = new Date(dateStr);
    if (!isNaN(native.getTime())) {
      return native;
    }
  }

  // Fallback: US format M/d/yy or MM/dd/yy (Excel often exports dates as M/d/yy when locale is US)
  const usStyleMatch = dateStr
    .trim()
    .match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usStyleMatch) {
    const [, first, second, yearPart] = usStyleMatch;
    const a = parseInt(first, 10);
    const b = parseInt(second, 10);
    let fullYear = parseInt(yearPart, 10);
    if (fullYear < 100) fullYear = getFullYear(fullYear);
    // If first <= 12 and second <= 31, treat as MM/dd (US)
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      const d = new Date(fullYear, a - 1, b);
      if (!isNaN(d.getTime())) return d;
    }
    // Otherwise try as dd/MM (Brazil)
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      const d = new Date(fullYear, b - 1, a);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

/**
 * Parse date strings from Excel import. Excel often exports dates in US format (MM/dd/yy)
 * even for Brazilian files. This function tries US format FIRST for ambiguous dates
 * (when both parts are <= 12) to avoid day/month swap (e.g. "5/1/26" = May 1, not Jan 5).
 */
export function parseDateFromExcel(dateStr: string): Date | null {
  const currentYear = new Date().getFullYear();
  const getFullYear = (twoDigitYear: number): number => {
    const currentLastTwoDigits = currentYear % 100;
    if (twoDigitYear > currentLastTwoDigits + 10) return 1900 + twoDigitYear;
    return 2000 + twoDigitYear;
  };

  const str = String(dateStr || "").trim();
  if (!str) return null;

  // ISO format - use as-is
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    return !isNaN(d.getTime()) ? d : null;
  }

  // US formats FIRST (Excel typically exports MM/dd/yy)
  const usFormats = ["MM/dd/yyyy", "M/d/yyyy", "MM/dd/yy", "M/d/yy"];
  for (const fmt of usFormats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (!isNaN(parsed.getTime())) {
        if (parsed.getFullYear() < 100) {
          parsed.setFullYear(getFullYear(parsed.getFullYear()));
        }
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Brazil formats
  const brFormats = ["dd/MM/yyyy", "dd-MM-yyyy", "dd/MM/yy", "dd-MM-yy"];
  for (const fmt of brFormats) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (!isNaN(parsed.getTime())) {
        if (parsed.getFullYear() < 100) {
          parsed.setFullYear(getFullYear(parsed.getFullYear()));
        }
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Manual fallback for ambiguous M/d/yy
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const [, a, b, y] = match;
    const n1 = parseInt(a!, 10);
    const n2 = parseInt(b!, 10);
    let year = parseInt(y!, 10);
    if (year < 100) year = getFullYear(year);
    // Prefer US: first = month, second = day
    if (n1 >= 1 && n1 <= 12 && n2 >= 1 && n2 <= 31) {
      const d = new Date(year, n1 - 1, n2);
      if (!isNaN(d.getTime())) return d;
    }
    // Fallback: Brazil
    if (n2 >= 1 && n2 <= 12 && n1 >= 1 && n1 <= 31) {
      const d = new Date(year, n2 - 1, n1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return parseDate(str);
}

/**
 * Convert Excel serial number to Date in local timezone (Brazil).
 * Excel stores dates as days since 1900-01-01. Using UTC conversion then
 * extracting UTC components to build local date avoids timezone shift bugs.
 */
export function parseExcelSerial(excelSerial: number): Date {
  const utcDate = new Date((excelSerial - 25569) * 86400 * 1000);
  return new Date(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
  );
}

/**
 * Get YYYY-MM-DD string from a Date, using local date components.
 * Avoids UTC conversion shifting the day (e.g. Brazil UTC-3).
 */
export function toDateStringLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format date for database storage (YYYY-MM-DD).
 * Uses local date components to avoid timezone shift in Brazil.
 */
export function formatDateForStorage(date: Date | string): string {
  if (typeof date === "string") {
    const iso = date.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const d = new Date(date);
    if (!isNaN(d.getTime())) return toDateStringLocal(d);
  }
  return toDateStringLocal(typeof date === "string" ? new Date(date) : date);
}

/** Product code 7 = Frota, uses 40 days for urgent; others use 10 days. */
const FROTA_PRODUCT_CODE = 7;
const URGENT_DAYS_DEFAULT = 10;
const URGENT_DAYS_FROTA = 40;

function isFrotaProduct(product: string | undefined): boolean {
  if (!product?.trim()) return false;
  const part = product.includes(" - ") ? product.split(" - ")[0]?.trim() : product.trim();
  const code = parseInt(part || "", 10);
  return code === FROTA_PRODUCT_CODE;
}

export function classifyDueStatus(dueDate: Date | string, product?: string): DueStatus {
  const date = toLocalDate(dueDate);
  const today = startOfToday();
  const daysUntilDue = differenceInDays(date, today);

  const urgentDays = isFrotaProduct(product) ? URGENT_DAYS_FROTA : URGENT_DAYS_DEFAULT;
  const d15End = urgentDays + 10;
  const d30End = urgentDays + 25;

  if (daysUntilDue < 0) {
    return "overdue";
  } else if (daysUntilDue <= urgentDays) {
    return "d7";
  } else if (daysUntilDue <= d15End) {
    return "d15";
  } else if (daysUntilDue <= d30End) {
    return "d30";
  } else {
    return "future";
  }
}

export function getStatusColor(status: DueStatus): string {
  switch (status) {
    case "overdue":
      return "bg-red-950/40 border-red-900";
    case "d7":
      return "bg-amber-950/40 border-amber-900";
    case "d15":
      return "bg-yellow-950/40 border-yellow-900";
    case "d30":
      return "bg-green-950/40 border-green-900";
    default:
      return "bg-gray-950/40 border-gray-900";
  }
}

export function isBirthdayToday(birthday: Date | string | undefined): boolean {
  if (!birthday) return false;
  const date = toLocalDate(birthday);
  const today = new Date();
  // Compare only month and day, ignore year
  return (
    date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  );
}

export function isBirthdayThisMonth(
  birthday: Date | string | undefined,
): boolean {
  if (!birthday) return false;
  const date = toLocalDate(birthday);
  const today = new Date();
  // Compare only month, ignore year and day
  return date.getMonth() === today.getMonth();
}

export function getNext12Months(): Date[] {
  const months: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    months.push(addMonths(today, i));
  }
  return months;
}

export function getMonthBucket(date: Date): string {
  return format(date, "MMM/yyyy", { locale: ptBR });
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural || `${singular}s`}`;
}
