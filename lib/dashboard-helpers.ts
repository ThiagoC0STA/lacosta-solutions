import type {
  Client,
  DashboardStats,
  Policy,
  RenewalWithClient,
} from "@/types";
import {
  differenceInDays,
  isSameDay,
  isSameMonth,
  startOfToday,
} from "date-fns";
import { classifyDueStatus } from "./date-helpers";

export function computeDashboardStats(
  policies: Policy[],
  clients: Client[]
): DashboardStats {
  const today = startOfToday();

  const overdue = policies.filter((p) => {
    const dueDate =
      typeof p.dueDate === "string" ? new Date(p.dueDate) : p.dueDate;
    return differenceInDays(dueDate, today) < 0 && p.status === "active";
  }).length;

  const dueIn0to7 = policies.filter((p) => {
    const status = classifyDueStatus(p.dueDate);
    return status === "d7" && p.status === "active";
  }).length;

  const dueIn8to15 = policies.filter((p) => {
    const status = classifyDueStatus(p.dueDate);
    return status === "d15" && p.status === "active";
  }).length;

  const dueIn16to30 = policies.filter((p) => {
    const status = classifyDueStatus(p.dueDate);
    return status === "d30" && p.status === "active";
  }).length;

  const birthdaysThisMonth = clients.filter((c) => {
    if (!c.birthday) return false;
    const birthday =
      typeof c.birthday === "string" ? new Date(c.birthday) : c.birthday;
    return isSameMonth(birthday, today);
  }).length;

  const birthdaysToday = clients.filter((c) => {
    if (!c.birthday) return false;
    const birthday =
      typeof c.birthday === "string" ? new Date(c.birthday) : c.birthday;
    return isSameDay(birthday, today);
  }).length;

  return {
    overdue,
    dueIn0to7,
    dueIn8to15,
    dueIn16to30,
    birthdaysThisMonth,
    birthdaysToday,
  };
}

export function getTopRenewals(
  renewals: RenewalWithClient[],
  limit: number = 10
): RenewalWithClient[] {
  return renewals
    .filter((r) => r.status === "active")
    .sort((a, b) => {
      const dateA =
        typeof a.dueDate === "string" ? new Date(a.dueDate) : a.dueDate;
      const dateB =
        typeof b.dueDate === "string" ? new Date(b.dueDate) : b.dueDate;
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, limit);
}

export function getTodaysBirthdays(clients: Client[]): Client[] {
  const today = new Date();
  return clients.filter((c) => {
    if (!c.birthday) return false;
    const birthday =
      typeof c.birthday === "string" ? new Date(c.birthday) : c.birthday;
    return isSameDay(birthday, today);
  });
}

export function getRenewalsByMonth(
  renewals: RenewalWithClient[],
  months: Date[]
): Record<string, number> {
  const result: Record<string, number> = {};

  months.forEach((month) => {
    const monthKey = `${month.getMonth() + 1}/${month.getFullYear()}`;
    result[monthKey] = renewals.filter((r) => {
      if (r.status !== "active") return false;
      const dueDate =
        typeof r.dueDate === "string" ? new Date(r.dueDate) : r.dueDate;
      return (
        dueDate.getMonth() === month.getMonth() &&
        dueDate.getFullYear() === month.getFullYear()
      );
    }).length;
  });

  return result;
}
