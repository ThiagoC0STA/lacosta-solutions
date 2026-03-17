import type { Client, Policy } from "@/types";
import { supabase } from "./client";
import { createClientsBatch, createPoliciesBatch, deleteAllClients, deleteAllPolicies } from "./queries";

export interface Backup {
  id: string;
  name: string;
  created_at: string;
  clients_count: number;
  policies_count: number;
}

export interface BackupWithData extends Backup {
  clients_data: Client[];
  policies_data: Policy[];
}

export async function createBackup(
  clients: Client[],
  policies: Policy[],
  name?: string
): Promise<Backup> {
  const backupName =
    name || `Backup ${new Date().toLocaleDateString("pt-BR")} - ${clients.length} clients, ${policies.length} policies`;

  const { data, error } = await supabase
    .from("backups")
    .insert({
      name: backupName,
      clients_data: clients,
      policies_data: policies,
    })
    .select("id, name, created_at, clients_data, policies_data")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    created_at: data.created_at,
    clients_count: (data.clients_data as Client[]).length,
    policies_count: (data.policies_data as Policy[]).length,
  };
}

export async function getBackups(): Promise<Backup[]> {
  const { data, error } = await supabase
    .from("backups")
    .select("id, name, created_at, clients_data, policies_data")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((b) => ({
    id: b.id,
    name: b.name,
    created_at: b.created_at,
    clients_count: (b.clients_data as Client[]).length,
    policies_count: (b.policies_data as Policy[]).length,
  }));
}

export async function getBackupById(id: string): Promise<BackupWithData | null> {
  const { data, error } = await supabase
    .from("backups")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    created_at: data.created_at,
    clients_count: (data.clients_data as Client[]).length,
    policies_count: (data.policies_data as Policy[]).length,
    clients_data: data.clients_data,
    policies_data: data.policies_data,
  };
}

export async function deleteBackup(id: string): Promise<void> {
  const { error } = await supabase.from("backups").delete().eq("id", id);
  if (error) throw error;
}

export async function restoreFromBackup(id: string): Promise<void> {
  const backup = await getBackupById(id);
  if (!backup) throw new Error("Backup not found");

  const clients = backup.clients_data as Client[];
  const policies = backup.policies_data as Policy[];

  if (clients.length === 0 && policies.length === 0) return;
  if (policies.length > 0 && clients.length === 0) throw new Error("Invalid backup: policies without clients");

  // Clear existing data before restore (replace current state with backup)
  await deleteAllPolicies();
  await deleteAllClients();

  const clientsToInsert = clients.map(({ id: _id, ...c }) => c);
  const newClients = await createClientsBatch(clientsToInsert);

  const clientIdMap = new Map<string, string>();
  clients.forEach((c, i) => clientIdMap.set(c.id, newClients[i].id));

  const policiesToInsert = policies.map(({ id: _id, clientId, ...p }) => ({
    ...p,
    clientId: clientIdMap.get(clientId) ?? clientId,
  }));
  await createPoliciesBatch(policiesToInsert);
}

export async function clearAllWithBackup(clients: Client[], policies: Policy[]): Promise<Backup> {
  const backup = await createBackup(clients, policies, `Backup antes de limpeza - ${new Date().toLocaleString("pt-BR")}`);
  await deleteAllPolicies();
  await deleteAllClients();
  return backup;
}
