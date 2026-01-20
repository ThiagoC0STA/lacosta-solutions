import type { DueStatus } from "@/types";
import {
  addMonths,
  differenceInDays,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: ptBR });
}

export function parseDate(dateStr: string): Date | null {
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
        return parsed;
      }
    } catch {
      continue;
    }
  }

  // Try native Date parsing
  const native = new Date(dateStr);
  if (!isNaN(native.getTime())) {
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
  return isSameDay(date, new Date());
}

export function isBirthdayThisMonth(
  birthday: Date | string | undefined
): boolean {
  if (!birthday) return false;
  const date = typeof birthday === "string" ? new Date(birthday) : birthday;
  return isSameMonth(date, new Date());
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
