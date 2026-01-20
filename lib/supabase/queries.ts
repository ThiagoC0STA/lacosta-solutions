import type { Client, Policy } from "@/types";
import { supabase } from "./client";

// ============================================
// CLIENTS
// ============================================

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

const DEFAULT_LIMIT = 1000; // Safety limit to prevent loading everything
const MAX_LIMIT = 10000; // Maximum limit for operations that need more data (e.g., duplicate checking)

export async function getClients(options?: PaginationOptions): Promise<Client[]> {
  let query = supabase
    .from("clients")
    .select("*", { count: "exact" });

  // Apply search filter if provided
  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`);
  }

  // Apply ordering
  query = query.order("name", { ascending: true });

  // Apply pagination with safety limits
  const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getClientById(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createClient(
  client: Omit<Client, "id">
): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: client.name,
      phone: client.phone,
      email: client.email,
      birthday: client.birthday
        ? new Date(client.birthday).toISOString().split("T")[0]
        : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClient(
  id: string,
  client: Partial<Omit<Client, "id">>
): Promise<Client> {
  const updateData: any = {};
  if (client.name !== undefined) updateData.name = client.name;
  if (client.phone !== undefined) updateData.phone = client.phone;
  if (client.email !== undefined) updateData.email = client.email;
  if (client.birthday !== undefined) {
    updateData.birthday = client.birthday
      ? new Date(client.birthday).toISOString().split("T")[0]
      : null;
  }

  const { data, error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

export async function createClientsBatch(
  clients: Omit<Client, "id">[]
): Promise<Client[]> {
  const clientsToInsert = clients.map((client) => ({
    name: client.name,
    phone: client.phone,
    email: client.email,
    birthday: client.birthday
      ? new Date(client.birthday).toISOString().split("T")[0]
      : null,
  }));

  const { data, error } = await supabase
    .from("clients")
    .insert(clientsToInsert)
    .select();

  if (error) throw error;
  return data || [];
}

// ============================================
// POLICIES
// ============================================

export interface PolicyFilters extends PaginationOptions {
  clientId?: string;
  status?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export async function getPolicies(options?: PolicyFilters): Promise<Policy[]> {
  let query = supabase
    .from("policies")
    .select("*", { count: "exact" });

  // Apply filters
  if (options?.clientId) {
    query = query.eq("client_id", options.clientId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.dueDateFrom) {
    query = query.gte("due_date", options.dueDateFrom);
  }
  if (options?.dueDateTo) {
    query = query.lte("due_date", options.dueDateTo);
  }

  // Apply ordering
  query = query.order("due_date", { ascending: true });

  // Apply pagination with safety limits
  const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;
  return data?.map(transformPolicyFromDB) || [];
}

export async function getPolicyById(id: string): Promise<Policy | null> {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data ? transformPolicyFromDB(data) : null;
}

export async function getPoliciesByClientId(
  clientId: string
): Promise<Policy[]> {
  const { data, error } = await supabase
    .from("policies")
    .select("*")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data?.map(transformPolicyFromDB) || [];
}

export async function createPolicy(
  policy: Omit<Policy, "id">
): Promise<Policy> {
  const { data, error } = await supabase
    .from("policies")
    .insert({
      client_id: policy.clientId,
      policy_number: policy.policyNumber,
      insurer: policy.insurer,
      product: policy.product,
      due_date: new Date(policy.dueDate).toISOString().split("T")[0],
      premium: policy.premium,
      status: policy.status,
      notes: policy.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return transformPolicyFromDB(data);
}

export async function updatePolicy(
  id: string,
  policy: Partial<Omit<Policy, "id">>
): Promise<Policy> {
  const updateData: any = {};
  if (policy.clientId !== undefined) updateData.client_id = policy.clientId;
  if (policy.policyNumber !== undefined)
    updateData.policy_number = policy.policyNumber;
  if (policy.insurer !== undefined) updateData.insurer = policy.insurer;
  if (policy.product !== undefined) updateData.product = policy.product;
  if (policy.dueDate !== undefined) {
    updateData.due_date = new Date(policy.dueDate).toISOString().split("T")[0];
  }
  if (policy.premium !== undefined) updateData.premium = policy.premium;
  if (policy.status !== undefined) updateData.status = policy.status;
  if (policy.notes !== undefined) updateData.notes = policy.notes;

  const { data, error } = await supabase
    .from("policies")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return transformPolicyFromDB(data);
}

export async function deletePolicy(id: string): Promise<void> {
  const { error } = await supabase.from("policies").delete().eq("id", id);
  if (error) throw error;
}

export async function createPoliciesBatch(
  policies: Omit<Policy, "id">[]
): Promise<Policy[]> {
  const policiesToInsert = policies.map((policy) => ({
    client_id: policy.clientId,
    policy_number: policy.policyNumber,
    insurer: policy.insurer,
    product: policy.product,
    due_date: new Date(policy.dueDate).toISOString().split("T")[0],
    premium: policy.premium,
    status: policy.status,
    notes: policy.notes,
  }));

  const { data, error } = await supabase
    .from("policies")
    .insert(policiesToInsert)
    .select();

  if (error) throw error;
  return data?.map(transformPolicyFromDB) || [];
}

// Get policies with client data for duplicate checking
// Note: For duplicate checking during imports, this may need to load more data
// Use options.limit to increase if needed (up to MAX_LIMIT)
export async function getPoliciesWithClients(options?: PolicyFilters): Promise<Array<Policy & { client: Client }>> {
  let query = supabase
    .from("policies")
    .select(`
      *,
      clients:client_id (
        id,
        name,
        phone,
        email,
        birthday
      )
    `, { count: "exact" });

  // Apply filters
  if (options?.clientId) {
    query = query.eq("client_id", options.clientId);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.dueDateFrom) {
    query = query.gte("due_date", options.dueDateFrom);
  }
  if (options?.dueDateTo) {
    query = query.lte("due_date", options.dueDateTo);
  }

  // Apply ordering
  query = query.order("due_date", { ascending: true });

  // Apply pagination with safety limits
  const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) throw error;
  
  return (data || []).map((item: any) => ({
    ...transformPolicyFromDB(item),
    client: {
      id: item.clients.id,
      name: item.clients.name,
      phone: item.clients.phone,
      email: item.clients.email,
      birthday: item.clients.birthday,
    },
  }));
}

export async function deleteAllPolicies(): Promise<void> {
  // Get all policies first
  const { data: policies } = await supabase.from("policies").select("id");
  if (policies && policies.length > 0) {
    const ids = policies.map((p) => p.id);
    const { error } = await supabase.from("policies").delete().in("id", ids);
    if (error) throw error;
  }
}

export async function deleteAllClients(): Promise<void> {
  // Get all clients first
  const { data: clients } = await supabase.from("clients").select("id");
  if (clients && clients.length > 0) {
    const ids = clients.map((c) => c.id);
    const { error } = await supabase.from("clients").delete().in("id", ids);
    if (error) throw error;
  }
}

// ============================================
// HELPERS
// ============================================

function transformPolicyFromDB(dbPolicy: any): Policy {
  return {
    id: dbPolicy.id,
    clientId: dbPolicy.client_id,
    policyNumber: dbPolicy.policy_number,
    insurer: dbPolicy.insurer,
    product: dbPolicy.product,
    dueDate: dbPolicy.due_date,
    premium: dbPolicy.premium ? parseFloat(dbPolicy.premium) : undefined,
    status: dbPolicy.status,
    notes: dbPolicy.notes,
  };
}
