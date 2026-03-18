export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: Date | string;
}

export interface Policy {
  id: string;
  clientId: string;
  policyNumber?: string;
  insurer?: string;
  product?: string;
  dueDate: Date | string;
  premium?: number;
  status: "active" | "inactive"; // renewed/lost for backward compat from DB
  notes?: string;
}

export type DueStatus = "overdue" | "d7" | "d15" | "d30" | "future";

export interface DashboardStats {
  overdue: number;
  dueIn0to7: number;
  dueIn8to15: number;
  dueIn16to30: number;
  birthdaysThisMonth: number;
  birthdaysToday: number;
}

export interface RenewalWithClient extends Policy {
  client: Client;
}

export interface Product {
  id: string;
  code: number;
  name: string;
}

/** Returns "code - name" format for display */
export function productDisplay(p: Product): string {
  return `${p.code} - ${p.name}`;
}

export interface Insurer {
  id: string;
  name: string;
  logoUrl?: string;
}

