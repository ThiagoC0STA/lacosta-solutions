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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================
// CLIENTS
// ============================================

export function useClients() {
  const queryClient = useQueryClient();

  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const updateMutation = useMutation({
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
    data: policies = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["policies"],
    queryFn: getPolicies,
  });

  const createMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Policy, "id">>;
    }) => updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: createPoliciesBatch,
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
