const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"
).replace(/\/$/, "");
const call = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const payload = (await response.json()) as {
    success: boolean;
    data: T;
    error?: { message: string };
  };
  if (!response.ok)
    throw new Error(
      payload.error?.message ?? "No fue posible completar la operación",
    );
  return payload.data;
};
const auth = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});
export interface Seller {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  referralCode: string;
  status: string;
  commissionType: "percentage" | "fixed";
  commissionRate: number;
  commissionDurationMonths: number | null;
  commissionHoldDays: number;
  clientCount?: number;
  availableCommission?: number;
}
export interface SellerDetail {
  seller: Seller;
  clients: Array<{
    _id: string;
    organizationId: { _id: string; name: string; status: string };
    status: string;
    attributedAt: string;
    lostAt: string | null;
  }>;
  commissions: Array<{
    _id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  settlements: Array<{
    _id: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}
export const salesApi = {
  sellers: (token: string) =>
    call<Seller[]>("/admin/sales", { headers: auth(token) }),
  create: (token: string, body: unknown) =>
    call<{ seller: Seller; invitationUrl: string }>("/admin/sales", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  detail: (token: string, id: string) =>
    call<SellerDetail>(`/admin/sales/${id}`, { headers: auth(token) }),
  invitation: (token: string) =>
    call<{
      firstName: string;
      lastName: string;
      email: string;
      expiresAt: string;
    }>(`/sales/public/invitations/${token}`),
  accept: (accessToken: string, token: string) =>
    call<{ sellerId: string; referralCode: string }>(
      `/sales/invitations/${token}/accept`,
      { method: "POST", headers: auth(accessToken) },
    ),
  dashboard: (token: string) =>
    call<SellerDetail>("/sales/dashboard", { headers: auth(token) }),
};
