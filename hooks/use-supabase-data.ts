"use client";

import {
  createClient,
  createClientsBatch,
  createPoliciesBatch,
  createPolicy,
  deleteClient,
  deletePolicy,
  getClients,
  getPolicies,
  updateClient,
  updatePolicy,
} from "@/lib/supabase/queries";
import type { Client, Policy } from "@/types";
import { useMutation, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";

// ============================================
// CLIENTS
// ============================================

export function useClients() {
  const queryClient = useQueryClient();

  const {
    data: clients = [] as Client[],
    isLoading,
    error,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  }) as UseQueryResult<Client[], Error>;

  const createMutation = useMutation<Client, Error, Client>({
    mutationFn: (client) => createClient(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const updateMutation = useMutation<Client, Error, { id: string; data: Partial<Omit<Client, "id">> }>({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Client, "id">>;
    }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: createClientsBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return {
    clients,
    isLoading,
    error,
    createClient: createMutation.mutateAsync,
    updateClient: updateMutation.mutateAsync,
    deleteClient: deleteMutation.mutateAsync,
    createClientsBatch: createBatchMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCreatingBatch: createBatchMutation.isPending,
  };
}

// ============================================
// POLICIES
// ============================================

export function usePolicies() {
  const queryClient = useQueryClient();

  const {
    data: policies = [] as Policy[],
    isLoading,
    error,
  } = useQuery<Policy[]>({
    queryKey: ["policies"],
    queryFn: () => getPolicies(),
  }) as UseQueryResult<Policy[], Error>;

  const createMutation = useMutation<Policy, Error, Omit<Policy, "id">>({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const updateMutation = useMutation<Policy, Error, { id: string; data: Partial<Omit<Policy, "id">> }>({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Policy, "id">>;
    }) => updatePolicy(id, data),
    onSuccess: (updatedPolicy) => {
      // Optimistically update the cache to avoid refetch delay
      queryClient.setQueryData<Policy[]>(["policies"], (old) => {
        if (!old) return [updatedPolicy];
        return old.map((p) => (p.id === updatedPolicy.id ? updatedPolicy : p));
      });
      // Still invalidate to ensure consistency, but with a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["policies"] });
      }, 100);
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const createBatchMutation = useMutation<Policy[], Error, Policy[]>({
    mutationFn: (policies) => createPoliciesBatch(policies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  return {
    policies,
    isLoading,
    error,
    createPolicy: createMutation.mutateAsync,
    updatePolicy: updateMutation.mutateAsync,
    deletePolicy: deleteMutation.mutateAsync,
    createPoliciesBatch: createBatchMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCreatingBatch: createBatchMutation.isPending,
  };
}
