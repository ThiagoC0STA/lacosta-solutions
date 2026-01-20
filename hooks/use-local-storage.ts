"use client";

import { useState, useEffect } from "react";
import type { Client, Policy } from "@/types";

const CLIENTS_KEY = "lacosta_clients";
const POLICIES_KEY = "lacosta_policies";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

export function useClients() {
  return useLocalStorage<Client[]>(CLIENTS_KEY, []);
}

export function usePolicies() {
  return useLocalStorage<Policy[]>(POLICIES_KEY, []);
}

export function getClientsFromStorage(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const item = window.localStorage.getItem(CLIENTS_KEY);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
}

export function getPoliciesFromStorage(): Policy[] {
  if (typeof window === "undefined") return [];
  try {
    const item = window.localStorage.getItem(POLICIES_KEY);
    return item ? JSON.parse(item) : [];
  } catch {
    return [];
  }
}

