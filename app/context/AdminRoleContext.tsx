"use client";

import {
  createContext,
  useContext,
  useMemo,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";

export type AdminSubRole = "teacher" | "college_counselor";

interface AdminRoleContextValue {
  adminSubRole: AdminSubRole | null;
  setAdminSubRole: Dispatch<SetStateAction<AdminSubRole | null>>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AdminRoleContext = createContext<AdminRoleContextValue | undefined>(undefined);

interface AdminRoleProviderProps {
  children: ReactNode;
  value: AdminRoleContextValue;
}

export function AdminRoleProvider({ children, value }: AdminRoleProviderProps) {
  const memoizedValue = useMemo(
    () => ({
      adminSubRole: value.adminSubRole,
      setAdminSubRole: value.setAdminSubRole,
      loading: value.loading,
      refresh: value.refresh,
    }),
    [value.adminSubRole, value.loading, value.refresh, value.setAdminSubRole]
  );
  return <AdminRoleContext.Provider value={memoizedValue}>{children}</AdminRoleContext.Provider>;
}

export function useAdminRole() {
  const ctx = useContext(AdminRoleContext);
  if (!ctx) {
    throw new Error("useAdminRole must be used within an AdminRoleProvider");
  }
  return ctx;
}

