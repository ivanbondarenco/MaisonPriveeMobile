import { apiRequest } from "@/lib/apiClient";

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

export const paymentsEnabledQueryKey = ["settings", "payments_enabled"] as const;
export const bankAccountsQueryKey = ["bank-accounts"] as const;
export const exchangeRateQueryKey = ["exchange-rate"] as const;

// Anything but an explicit "true" (missing setting, failed request) counts as
// disabled, exactly like the storefront.
export const getPaymentsEnabled = () =>
  apiRequest<{ key: string; value: string } | null>("/settings/payments_enabled", { auth: false })
    .then((setting) => setting?.value === "true")
    .catch(() => false);

export const getBankAccounts = () =>
  apiRequest<BankAccount[]>("/bank-accounts", { auth: false }).catch(() => [] as BankAccount[]);

export const getExchangeRate = () =>
  apiRequest<ExchangeRate>("/exchange-rate", { auth: false }).catch(() => null);
