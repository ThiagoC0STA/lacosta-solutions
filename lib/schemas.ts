import { z } from "zod";

export const clientSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome do cliente é obrigatório"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.date().optional().or(z.string().optional()),
});

export const policySchema = z.object({
  id: z.string(),
  clientId: z.string(),
  policyNumber: z.string().optional(),
  insurer: z.string().optional(),
  product: z.string().optional(),
  dueDate: z.date(),
  premium: z.number().optional(),
  status: z.enum(["active", "renewed", "lost"]).default("active"),
  notes: z.string().optional(),
});

export const importRowSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  dueDate: z.string().or(z.date()),
  birthday: z.string().optional().or(z.date().optional()),
  policyNumber: z.string().optional(),
  insurer: z.string().optional(),
  product: z.string().optional(),
  premium: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});
