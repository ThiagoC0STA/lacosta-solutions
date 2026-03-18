"use client";

import {
  createClient,
  createClientsBatch,
  createInsurer,
  createPoliciesBatch,
  createPolicy,
  createProduct,
  deleteClient,
  deleteInsurer,
  deletePolicy,
  deleteProduct,
  getClients,
  getInsurers,
  getPolicies,
  getProducts,
  updateClient,
  updateInsurer,
  updatePolicy,
  updateProduct,
} from "@/lib/supabase/queries";
import {
  createBackup,
  deleteBackup,
  getBackups,
  restoreFromBackup,
  type Backup,
} from "@/lib/supabase/backup-queries";
import type { Client, Policy, Product, Insurer } from "@/types";
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

// ============================================
// PRODUCTS
// ============================================

export function useProducts() {
  const queryClient = useQueryClient();

  const {
    data: products = [] as Product[],
    isLoading,
    error,
  } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => getProducts(),
  }) as UseQueryResult<Product[], Error>;

  const createMutation = useMutation<Product, Error, Omit<Product, "id">>({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateMutation = useMutation<Product, Error, { id: string; data: Partial<Omit<Product, "id">> }>({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// INSURERS
// ============================================

export function useInsurers() {
  const queryClient = useQueryClient();

  const {
    data: insurers = [] as Insurer[],
    isLoading,
    error,
  } = useQuery<Insurer[]>({
    queryKey: ["insurers"],
    queryFn: () => getInsurers(),
  }) as UseQueryResult<Insurer[], Error>;

  const createMutation = useMutation<Insurer, Error, Omit<Insurer, "id">>({
    mutationFn: createInsurer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurers"] });
    },
  });

  const updateMutation = useMutation<Insurer, Error, { id: string; data: Partial<Omit<Insurer, "id">> }>({
    mutationFn: ({ id, data }) => updateInsurer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurers"] });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteInsurer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurers"] });
    },
  });

  return {
    insurers,
    isLoading,
    error,
    createInsurer: createMutation.mutateAsync,
    updateInsurer: updateMutation.mutateAsync,
    deleteInsurer: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================
// BACKUPS
// ============================================

export function useBackups() {
  const queryClient = useQueryClient();

  const {
    data: backups = [],
    isLoading,
    error,
  } = useQuery<Backup[]>({
    queryKey: ["backups"],
    queryFn: () => getBackups(),
  }) as UseQueryResult<Backup[], Error>;

  const restoreMutation = useMutation<void, Error, string>({
    mutationFn: restoreFromBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });

  const createMutation = useMutation<Backup, Error, { clients: Client[]; policies: Policy[] }>({
    mutationFn: ({ clients, policies }) => createBackup(clients, policies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });

  return {
    backups,
    isLoading,
    error,
    createBackup: createMutation.mutateAsync,
    restoreBackup: restoreMutation.mutateAsync,
    deleteBackup: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isRestoring: restoreMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
