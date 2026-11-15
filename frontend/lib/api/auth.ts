import { request } from "./client";

export type Account = { id: string; name: string | null; expiresAt: string };
export const getAccount = (signal: AbortSignal) =>
  request<Account>("auth/session", { signal, cache: "no-store" });
export const logout = (accountId: string) => request<void>("auth/logout", {
  method: "POST", headers: { "x-account-id": accountId },
});
export const loginUrl = (origin: string) => `/api/auth/login?origin=${encodeURIComponent(origin)}`;
