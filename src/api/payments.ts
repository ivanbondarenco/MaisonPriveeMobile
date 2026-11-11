import { apiRequest } from "@/lib/apiClient";
import { flagQueryKey, getFlag } from "./settings";

// The three public lookups the storefront checkout makes before taking a
// transfer: the admin's payments switch, the bank accounts to transfer to,
// and the ARS rate (dólar cripto) used to show the peso amount.

export type BankAccount = {
  id: string;
  currency: string;
  bankName: string;
  cbu: string;
  alias: string;
  holderName: string;
};

export type ExchangeRate = {
  currency: string;
  source: string;
  buy: number;
  sell: number;
  updatedAt: string;
};

export const paymentsEnabledQueryKey = flagQueryKey("payments_enabled");
export const bankAccountsQueryKey = ["bank-accounts"] as const;
export const exchangeRateQueryKey = ["exchange-rate"] as const;

// The admin's payments switch; off unless explicitly "true", like the storefront.
export const getPaymentsEnabled = () => getFlag("payments_enabled");

export const getBankAccounts = () =>
  apiRequest<BankAccount[]>("/bank-accounts", { auth: false }).catch(() => [] as BankAccount[]);

export const getExchangeRate = () =>
  apiRequest<ExchangeRate>("/exchange-rate", { auth: false }).catch(() => null);
