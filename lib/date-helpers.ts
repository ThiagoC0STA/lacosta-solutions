import type { DueStatus } from "@/types";
import {
  addMonths,
  differenceInDays,
  format,
  parse,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
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

  // Try multiple date formats
  const formats = [
    "dd/MM/yyyy",
    "dd-MM-yyyy",
    "yyyy-MM-dd",
    "dd/MM/yy",
    "MM/dd/yyyy",
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

  // Try parsing with manual 2-digit year fix
  // Handle formats like "26/01/26" or "01/01/26" or "06/06/79"
  const twoDigitYearMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (twoDigitYearMatch) {
    const [, day, month, year] = twoDigitYearMatch;
    const twoDigitYear = parseInt(year, 10);
    const fullYear = getFullYear(twoDigitYear);
    const date = new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try native Date parsing
  const native = new Date(dateStr);
  if (!isNaN(native.getTime())) {
    // Fix 2-digit years intelligently
    if (native.getFullYear() < 100) {
      const twoDigitYear = native.getFullYear();
      native.setFullYear(getFullYear(twoDigitYear));
    }
    return native;
  }

  return null;
}

export function classifyDueStatus(dueDate: Date | string): DueStatus {
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = startOfToday();
  const daysUntilDue = differenceInDays(date, today);

  if (daysUntilDue < 0) {
    return "overdue";
  } else if (daysUntilDue <= 7) {
    return "d7";
  } else if (daysUntilDue <= 15) {
    return "d15";
  } else if (daysUntilDue <= 30) {
    return "d30";
  } else {
    return "future";
  }
}

export function getStatusColor(status: DueStatus): string {
  switch (status) {
    case "overdue":
      return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
    case "d7":
      return "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900";
    case "d15":
      return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900";
    case "d30":
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900";
    default:
      return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900";
  }
}

export function isBirthdayToday(birthday: Date | string | undefined): boolean {
  if (!birthday) return false;
  const date = typeof birthday === "string" ? new Date(birthday) : birthday;
  const today = new Date();
  // Compare only month and day, ignore year
  return date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

export function isBirthdayThisMonth(
  birthday: Date | string | undefined
): boolean {
  if (!birthday) return false;
  const date = typeof birthday === "string" ? new Date(birthday) : birthday;
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
