"use client";

import { createContext, useContext, ReactNode } from "react";

export interface CurrentUser {
  uid: string;
  email: string;
  name: string;
  role: "admin" | "staff";
}

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used inside UserProvider");
  }
  return ctx;
}
