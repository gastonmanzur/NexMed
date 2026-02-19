import { apiFetch } from "./client";
import { AuthProfile, ClinicPublicVisibility } from "../types";

export type ClinicProfileResponse = AuthProfile & {
  publicBookingUrl?: string;
  joinUrlDefault?: string;
};

export const getProfile = (token: string) => apiFetch<ClinicProfileResponse>("/profile", { cache: "no-store" }, token);

export const updateClinicProfile = (
  token: string,
  body: Partial<{
    name: string;
    phone: string;
    whatsapp: string;
    website: string;
    address: string;
    city: string;
    province: string;
    postalCode: string;
    description: string;
    businessHoursNote: string;
    legalName: string;
    taxId: string;
    billingEmail: string;
    fiscalAddress: string;
    fiscalCity: string;
    fiscalProvince: string;
    fiscalPostalCode: string;
    invoiceNotes: string;
    publicVisibility: Partial<ClinicPublicVisibility>;
  }>
) => apiFetch<ClinicProfileResponse>("/profile", { method: "PUT", body: JSON.stringify(body) }, token);

export const updatePatientProfile = (
  token: string,
  body: Partial<{ firstName: string; lastName: string; phone: string; whatsapp: string; age: number }>
) => apiFetch<ClinicProfileResponse>("/profile", { method: "PUT", body: JSON.stringify(body) }, token);
