# Análisis del repositorio origen (MaisonPrivee web)

Fuente: `C:\Users\nacho\MaisonPrivee` (Express 5 + TS/Prisma/Postgres backend, Next.js 16/React 19 storefront). Este documento es el insumo de arquitectura para construir `MaisonPriveeMobile` (app iOS/Android). No se repite aquí lo que ya está en el CLAUDE.md del repo web — esto es el detalle real de código relevado.

## 1. Backend (`backend/src`)

- Sin capa de "services": lógica de negocio inline en `routes/` (26 archivos), con extracciones parciales a `lib/` (`coupons.ts`, `memberships.ts`, `loyalty.ts`, `exchange-rate.ts`, `dhl.ts`, `push.ts`, `mailer.ts`, `notifications.ts`).
- **Auth**: `middleware/auth.ts` — JWT HS256 (`JWT_SECRET`), `authenticateToken` + `requireAdmin`. Sin refresh token, sin revocación, expira a los 7 días fijo. Rol es string libre (`USER`/`ADMIN`), no enum Prisma. Password reset con token random de 32 bytes sin hashear en DB, expira 1h.
- **Validación**: Zod solo en `users.ts` y `memberships.ts`. El resto de rutas (products, orders, consignment, offers, coupons, shipping, packaging, brands, categories) valida a mano.
- **Uploads**: 3 configs Multer independientes, todo a disco local (`process.cwd()/uploads`), sin S3. Servido estático sin auth en `/uploads`. Límite 15MB, tipos `jpeg|jpg|png|webp|gif|heic|heif|pdf`.
- **MercadoPago**: SDK v2 Node, API de **Orders** (no Checkout Pro), Card Payment Brick montado a mano vía `<script>` CDN (`@mercadopago/sdk-react` está en package.json pero **no se usa**). Conversión USD→ARS con `dolarapi.com` (cache en memoria 10 min, sin persistencia). Webhook (`/api/orders/webhooks/mercadopago`) sin validar firma `x-signature` — revalida contra la API de MP antes de aplicar cambios, lo que mitiga el riesgo pero no lo elimina.
- **Transferencia bancaria**: método de pago principal actual (cards deshabilitadas en UI según comentario en checkout). Flujo manual: sube comprobante, admin confirma/rechaza. Expira a las 48h pero **no hay cron que auto-cancele** órdenes vencidas.
- **Emails**: un solo transporter Gmail SMTP (duplicado en `lib/mailer.ts` y `routes/consignment.ts`), ~12 plantillas HTML inline, sin motor de templates ni cola.
- **Web Push**: solo notifica al panel admin (`PushSubscription.isAdmin`), nunca a usuarios finales. VAPID keys por env.
- **Rate limiting/Helmet**: global 1000 req/15min prod, auth-specific 15 req/15min en login/register. CORS whitelist explícita. `trust proxy: 1`.
- **Sin Dockerfiles, sin CI, sin `.env.example`.** Deploy a Easypanel por autodetect (Nixpacks). `bcrypt`, `esbuild`, `sharp` son binarios nativos — atención si se cambia arquitectura de contenedor.

## 2. Flujos de negocio clave

### Consignment → Product
Estados: `PENDING → REVIEWING → ACCEPTED → PAID_OUT` (o `REJECTED`). Al pasar a `ACCEPTED`, si no existe `Product`, el backend crea uno en `DRAFT` (upsert de Brand, categoría fija "Consignment", mapeo de condition, parseo de precio). Admin lo edita y pasa a `LIVE` manualmente. Payout (transacción atómica): marca `PAID_OUT`, acredita site credit si `payoutMethod=CREDIT`, bonus de primera venta (USD 100) y bonus de referido (USD 125 c/u) si aplica.

### Compra: carrito → checkout → pago → orden
Carrito en `localStorage`, sync a `Cart`/`CartItem` si hay login (debounce 2s). Checkout cotiza envío (DHL), aplica cupón (revalidado server-side) y site credit (clamp server-side). Pago por transferencia o tarjeta (MP Orders API). Confirmación dispara emails + `AdminNotification` + push a admins. Fulfillment (admin, DHL): genera guía + factura, PDF embebido en base64 en DB (no en storage de archivos).

### Membresía / "access code" (unlock)
**Los documentos `docs/plan_membresia_exclusiva.md` y `docs/cambios_codigo_exclusivo.md` describen un sistema de códigos de invitación que NO está implementado.** No existe modelo `ExclusiveCode` ni campo `isMember` en `User`. El catálogo (`/products`) es público, sin gating. Lo que sí existe es `MembershipPlan`/`UserMembership`: un beneficio pagado (perks), no una barrera de acceso. **Si la app mobile necesita gating real por código de invitación, es una feature nueva a construir desde cero**, no una migración.

### Ofertas (Offer)
El documento `RESUMEN_FUNCIONAL_OFERTAS.md` dice que es "solo email, no persistido" pero **el código ya evolucionó**: existe modelo `Offer` persistido en Prisma con estados `PENDING|ACCEPTED|REJECTED`, CRUD completo en `routes/offers.ts` (`GET /received`, `PATCH /:id/respond` con auto-rechazo de otras ofertas al aceptar una). Tratar como sistema funcional completo, no como flujo efímero.

### Referidos (refer-a-seller)
Ya commiteado y cableado. `User.referredByUserId` + `referralBonusPaid`. Link usa el propio `userId` como código (`?ref={userId}`). Bonus (USD 125 c/u) se paga recién en el primer payout pagado del referido, no al registrarse.

## 3. Storefront (Next.js)

- Sin `middleware.ts` — toda protección de rutas (`/admin/*`, `/vende`, `/mis-pedidos`, etc.) es client-side (`useEffect` + redirect), sin protección real a nivel de red.
- Auth: JWT + user en `localStorage` (`token`, `user`). Admin usa clave separada `admin_token`. Existe además una cookie httpOnly `admin_session=mpa122_authorized` con **valor hardcodeado**, desconectada del JWT real — evitar este patrón al portar.
- Sin cliente HTTP centralizado: mezcla de `lib/api.ts` (`useApi()`) y `fetch()` ad-hoc repetido en cada archivo.
- Estado: Context + `useReducer` en ~10 providers anidados (`AuthProvider`, `CartProvider`, `WishlistProvider`, `LanguageProvider`, `ToastProvider`, `PopupProvider`...). Sin Redux/Zustand/React Query — fetching manual con `useEffect`+`useState`, sin cache ni invalidación.

## 4. MercadoPago en mobile — hallazgo de investigación externa

MercadoPago **deprecó formalmente las integraciones vía WebView embebido en noviembre 2023**. Para React Native, el flujo oficialmente soportado es **Checkout Pro** abierto vía Safari View Controller (iOS) / Chrome Custom Tabs (Android) — no hay Card Payment Brick nativo oficial para RN. Esto es incompatible con el flujo actual del storefront (API de Orders + Brick embebido vía `<script>`). Como `MaisonPriveeMobile` es iOS-only, en la práctica solo aplica el mecanismo de Safari View Controller (`expo-web-browser` en RN). Dos caminos evaluados, ver `PLAN_IMPLEMENTACION.md` sección de pagos.

Fuentes:
- https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/integrate-checkout-pro/mobile/ios/reactnative-cli
- https://www.mercadopago.com.mx/developers/en/news/2023/11/30/WebView-integrations-have-been-deprecated
- https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/integrate-checkout-pro/mobile/android/reactnative-expo-go

## 5. Variables de entorno del backend (inventario para reuso desde mobile)

`DATABASE_URL, JWT_SECRET, PORT, NODE_ENV, FRONTEND_URL, BACKEND_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, ADMIN_EMAIL, MP_ACCESS_TOKEN, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, DHL_USERNAME, DHL_PASSWORD, DHL_ACCOUNT_NUMBER, DHL_API_BASE_URL, DHL_ORIGIN_*, DHL_SHIPPER_VAT, DHL_DEFAULT_HS_CODE`. (Variables `ANDREANI_*` son código muerto, no las lee nadie en runtime.)

Storefront: `NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MP_PUBLIC_KEY, NEXT_PUBLIC_SITE_URL`.
