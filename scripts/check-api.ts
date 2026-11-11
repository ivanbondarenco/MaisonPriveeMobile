// API contract check: calls the live backend and validates every response the
// app reads against src/api/contract.ts. Run it after a web/backend deploy (or
// before shipping an app update) to catch changes that would break the app.
//
//   npm run check:api
//
// Environment (all optional):
//   CHECK_API_URL       backend base URL, default production. Not read from .env on
//                       purpose: .env points at a dev machine on the LAN.
//   CHECK_API_EMAIL     a test account; with CHECK_API_PASSWORD, also checks the
//   CHECK_API_PASSWORD  signed-in endpoints (orders, credits, membership, ...).
//
// Read-only: only GETs, plus login/logout for the signed-in pass.

import { z } from "zod";

import {
  authResponseSchema,
  bankAccountSchema,
  brandSchema,
  cartSchema,
  catalogProductSchema,
  categoryNodeSchema,
  consignmentSchema,
  exchangeRateSchema,
  filterOptionsSchema,
  loyaltyStandingSchema,
  loyaltyTiersSchema,
  myMembershipSchema,
  orderSchema,
  productSchema,
  receivedOfferSchema,
  settingSchema,
  siteCreditSchema,
} from "../src/api/contract.ts";

const API_URL = (process.env.CHECK_API_URL ?? "https://api.maisonpriveeatelier.com/api").replace(/\/$/, "");
const EMAIL = process.env.CHECK_API_EMAIL;
const PASSWORD = process.env.CHECK_API_PASSWORD;

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

async function call(path: string, init: { method?: string; token?: string; body?: unknown } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    // not JSON: kept as text for the error message
  }
  return { status: response.status, payload };
}

function describe(payload: unknown) {
  if (Array.isArray(payload)) return payload.length === 0 ? "empty list, shape not verified" : `${payload.length} items`;
  return "ok";
}

async function check(name: string, path: string, schema: z.ZodType, init?: Parameters<typeof call>[1]) {
  try {
    const { status, payload } = await call(path, init);
    if (status < 200 || status >= 300) {
      const message = typeof payload === "object" && payload && "error" in payload ? String(payload.error) : String(payload).slice(0, 120);
      results.push({ name, ok: false, detail: `HTTP ${status}: ${message}` });
      return undefined;
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n      ");
      const more = parsed.error.issues.length > 5 ? `\n      … and ${parsed.error.issues.length - 5} more` : "";
      results.push({ name, ok: false, detail: `${issues}${more}` });
      return undefined;
    }
    results.push({ name, ok: true, detail: describe(payload) });
    return parsed.data;
  } catch (error) {
    results.push({ name, ok: false, detail: `request failed: ${(error as Error).message}` });
    return undefined;
  }
}

async function main() {
  console.log(`Checking ${API_URL}\n`);

  // Public endpoints
  const products = (await check("GET /products", "/products", z.array(catalogProductSchema))) as { id: string }[] | undefined;
  if (products?.[0]) await check("GET /products/:id", `/products/${products[0].id}`, productSchema);
  await check("GET /products/filters/options", "/products/filters/options", filterOptionsSchema);
  await check("GET /brands?onlyLive=true", "/brands?onlyLive=true", z.array(brandSchema));
  await check("GET /categories?onlyLive=true", "/categories?onlyLive=true", z.array(categoryNodeSchema));
  await check("GET /settings/payments_enabled", "/settings/payments_enabled", settingSchema);
  await check("GET /bank-accounts", "/bank-accounts", z.array(bankAccountSchema));
  await check("GET /exchange-rate", "/exchange-rate", exchangeRateSchema);
  await check("GET /loyalty/tiers", "/loyalty/tiers", loyaltyTiersSchema);

  // Signed-in endpoints, only with a test account
  if (EMAIL && PASSWORD) {
    const session = (await check("POST /users/login", "/users/login", authResponseSchema, {
      method: "POST",
      body: { email: EMAIL, password: PASSWORD, platform: "ios" },
    })) as z.infer<typeof authResponseSchema> | undefined;

    if (session) {
      const token = session.token;
      await check("GET /orders/mine", "/orders/mine", z.array(orderSchema), { token });
      await check("GET /memberships/me", "/memberships/me", myMembershipSchema, { token });
      await check("GET /credits/me", "/credits/me", siteCreditSchema, { token });
      await check("GET /wishlists", "/wishlists", z.array(productSchema), { token });
      await check("GET /carts/mine", "/carts/mine", cartSchema, { token });
      await check("GET /consignment/mine", "/consignment/mine", z.array(consignmentSchema), { token });
      await check("GET /offers/received", "/offers/received", z.array(receivedOfferSchema), { token });
      await check("GET /loyalty/me", "/loyalty/me", loyaltyStandingSchema, { token });

      // Revoke the session this run opened.
      if (session.refreshToken) {
        await call("/users/logout", { method: "POST", body: { refreshToken: session.refreshToken } }).catch(() => {});
      }
    }
  }

  for (const r of results) {
    console.log(`${r.ok ? "✔" : "✘"} ${r.name}  ${r.ok ? `(${r.detail})` : `\n      ${r.detail}`}`);
  }

  const failed = results.filter((r) => !r.ok).length;
  if (!EMAIL || !PASSWORD) {
    console.log("\nSigned-in endpoints skipped: set CHECK_API_EMAIL and CHECK_API_PASSWORD to include them.");
  }
  console.log(failed ? `\n${failed} of ${results.length} checks failed.` : `\nAll ${results.length} checks passed.`);
  process.exit(failed ? 1 : 0);
}

main();
