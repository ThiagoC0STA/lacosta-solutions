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
  status: "active" | "renewed" | "lost";
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

