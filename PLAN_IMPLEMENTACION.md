# Plan de implementación — Maison Privée Mobile (solo iOS)

Repo web de referencia: `C:\Users\nacho\MaisonPrivee`. Ver `ANALISIS_REPO_ORIGEN.md` en este mismo repo para el detalle de arquitectura relevado. Este documento es la guía de pasos, en orden de ejecución.

**Alcance: exclusivamente iOS.** No se builds ni se testea Android en ningún momento — no hace falta cuenta de Google Play, keystore, Firebase/FCM, ni Custom Tabs de Android. Se usa React Native/Expo igual (no porque haya multiplataforma, sino porque es el stack que permite compilar y firmar iOS 100% en la nube sin Mac), pero toda la configuración de EAS, build profiles y testing apunta solo a `ios`.

## Decisión de stack

**React Native + Expo (managed workflow) + EAS Build, target iOS únicamente.** Reusa el backend Express/Prisma tal cual (segundo cliente de la misma API). Resuelve la restricción de no tener hardware Apple: EAS Build compila el `.ipa` en macOS cloud de Expo; `eas submit` sube a App Store Connect. No hace falta Mac ni Xcode en ningún paso del desarrollo normal.

Costo obligatorio sin importar el stack: cuenta Apple Developer Program, USD 99/año (se paga con tarjeta, sin hardware).

## Fase 0 — Setup de entorno (sin escribir features todavía)

1. Crear cuenta en https://expo.dev y cuenta Apple Developer Program (si no existe ya).
2. En este repo (`MaisonPriveeMobile`):
   ```
   npx create-expo-app@latest . --template blank-typescript
   npx expo install expo-router expo-secure-store expo-image-picker expo-image expo-linking expo-web-browser expo-notifications expo-sharing
   npm install @tanstack/react-query @react-navigation/native zod
   npm install -g eas-cli
   eas login
   eas build:configure -p ios
   ```
   En `eas.json`, dejar solo perfiles `ios` (development/preview/production) — no generar el bloque `android` que el wizard ofrece por defecto.
3. Estructura de carpetas sugerida (paralela a la organización del storefront actual, para que el mapeo mental sea directo):
   ```
   src/
     api/          -> clientes fetch por dominio (products.ts, orders.ts, auth.ts, offers.ts, consignment.ts...)
     features/     -> pantallas + lógica por módulo (catalog, cart, checkout, consignment, offers, profile, referrals)
     components/   -> UI compartida
     context/       -> AuthContext, CartContext (mínimo, ver decisión de estado abajo)
     lib/           -> secure-store wrapper, deep-linking config, push notifications setup
   ```
4. Variables de entorno del cliente (`.env` con `EXPO_PUBLIC_` prefix, equivalente a `NEXT_PUBLIC_` del storefront):
   `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_MP_PUBLIC_KEY`, `EXPO_PUBLIC_SITE_URL` (para deep links universales).

## Fase 1 — Cambios de backend previos a mobile (bloqueantes)

Hacer esto ANTES de escribir pantallas que dependan de ello. Todos los cambios son en `C:\Users\nacho\MaisonPrivee\backend`.

1. **Refresh tokens**: hoy `users.ts` emite un JWT de 7 días sin refresh. Agregar:
   - Campo `refreshTokenHash` en `User` (o tabla `RefreshToken` separada si se quiere multi-dispositivo con revocación individual — recomendado, porque un usuario va a tener sesión web + mobile simultánea).
   - `POST /api/users/refresh` — recibe refresh token, devuelve nuevo access token de corta duración (15-30 min).
   - `POST /api/users/logout` — invalida el refresh token actual.
   - Migración Prisma nueva (ver Deploy Summary al final de cada sesión de trabajo).
2. **Push tokens de usuario final** (hoy `PushSubscription` solo tiene `isAdmin`, nunca se usa para push a compradores/vendedores):
   - Agregar tabla o reusar `PushSubscription` con un campo `platform` (dejar solo `ios`/`web`, no hace falta `android`) y `expoPushToken`.
   - `POST /api/push/subscribe` ya existe pero es admin-only — crear variante autenticada para usuario normal, o generalizar la existente con un flag.
   - Instalar `expo-server-sdk` en el backend para mandar push a través del servicio de Expo (abstrae APNs, no hay que hablar con Apple directo — igual sigue haciendo falta subir el certificado/key de APNs a Expo, ver "Puntos clave" abajo).
   - Enganchar en los puntos donde ya se llama `notifyOrderStatus`/`notifyPurchase` etc. (`lib/notifications.ts`) para que también dispare push al usuario dueño de la orden, no solo AdminNotification.
3. **Firma de webhook de MercadoPago**: `routes/orders.ts`, handler `POST /webhooks/mercadopago`. Hoy no valida `x-signature`. Agregar validación HMAC según la documentación de MP (buscar en MCP de MercadoPago o docs oficiales el algoritmo exacto de validación de firma antes de implementar — no adivinar el formato).
4. **Decisión de flujo de pago con tarjeta para mobile** (ver hallazgo en `ANALISIS_REPO_ORIGEN.md` sección 4 — MP deprecó WebView embebido, RN no tiene Card Brick nativo oficial):
   - **Opción A (recomendada, mínimo esfuerzo)**: crear una ruta mobile-friendly en el storefront Next.js existente, ej. `storefront/src/app/checkout/mobile/page.tsx`, que reusa el Brick actual pero con un layout simplificado (sin header/footer del sitio). La app RN la abre con `expo-web-browser` (`WebBrowser.openAuthSessionAsync`, usa SFSafariViewController en iOS — no WebView embebido, cumple la guía de MP). Al confirmar, esa página redirige a un deep link `maisonprivee://order/:id/confirmed` que la app captura con `expo-linking`.
   - **Opción B (más esfuerzo, más "nativo")**: migrar `orders.ts` de la API de Orders a Checkout Pro (crear `Preference` en vez de `Order` directa), con `back_urls` apuntando a deep links. Reescribe el flujo de pago actual también en el storefront web si se quiere consistencia.
   - Definir cuál se implementa ANTES de tocar la pantalla de checkout en mobile — condiciona el contrato de API.
5. Para el 48% que sigue pagando por transferencia bancaria: no requiere cambios de backend, solo la pantalla mobile equivalente (form + subida de comprobante con `expo-image-picker`).

## Fase 2 — MVP comprador (mobile)

Orden de implementación sugerido (cada ítem depende del anterior):

1. **Auth**: pantallas login/registro consumiendo `POST /api/users/login` y `/register` (ya validados con Zod en backend, reusar los mismos schemas de forma/mensaje de error). Guardar tokens con `expo-secure-store`, no `AsyncStorage` plano.
2. **Catálogo**: `GET /api/products` con filtros (replicar los mismos query params que usa `storefront/src/app/products/page.tsx`). Usar `@tanstack/react-query` para cache — a diferencia del storefront (que no tiene cache y refetchea manual en cada `useEffect`), en mobile el cache es más importante por la variabilidad de la red.
3. **Detalle de producto**: `GET /api/products/:id`, botón "Make an Offer" condicionado a `acceptOffers` (mismo campo que ya usa el storefront).
4. **Wishlist**: `GET/POST/DELETE /api/wishlist` (mapear a los endpoints reales revisando `routes/wishlist.ts`).
5. **Carrito**: local (Context+`useReducer`, igual que el storefront) + `POST /api/carts/sync` cuando hay sesión.
6. **Checkout**: implementar según la opción A o B definida en Fase 1, punto 4. Incluye cotización de envío (`POST /api/shipping/rates`) y validación de cupón (`POST /api/coupons/validate`) — replicar exactamente la lógica de clamp server-side que ya existe, no confiar en cálculos del cliente.
7. **Mis pedidos**: `GET /api/orders/mine`.
8. **Push notifications de estado de orden**: una vez que Fase 1 punto 2 esté lista en backend, registrar el token de push del dispositivo al loguearse (`expo-notifications` + `getExpoPushTokenAsync`).

Criterio de salida de esta fase: un usuario puede loguearse, navegar el catálogo, comprar por transferencia bancaria de punta a punta, y ver el estado de su pedido — sin tocar el panel admin ni el pago con tarjeta todavía.

## Fase 3 — Vendedor / consignante

1. **Formulario de consignación**: `POST /api/consignment` (público, sin auth, igual que hoy) con fotos vía `expo-image-picker` (cámara + galería) en vez de `<input type=file>`.
2. **Mis ofertas**: `GET /api/offers/received` + `PATCH /api/offers/:id/respond` para aceptar/rechazar (recordar: aceptar una oferta actualiza el precio del producto y auto-rechaza las demás, es lógica de backend ya existente, no hay que replicarla en el cliente).
3. **Referidos**: pantalla que arma el link `https://maisonpriveeatelier.com/refer?ref={userId}` (mismo mecanismo que hoy, el "código" es el propio `userId`) y lo comparte con `expo-sharing` en vez de copiar al portapapeles. Stats vía `GET /api/users/referral-stats`.
4. **Estado de mis consignaciones**: si no existe un endpoint `GET /api/consignment/mine` filtrado por usuario, agregarlo en backend (hoy `consignment.ts` probablemente solo tiene listado admin — verificar antes de asumir).
5. **Site credit**: saldo e historial en el perfil (`GET /api/credits/me`) y opción de aplicarlo en checkout (`creditApplied` en `POST /api/orders`, clamp server-side). Cubre el payout con `payoutMethod=CREDIT` y los bonos de primera venta/referido.

## Fase 4 — Membresía y pulido

1. Suscripción a `MembershipPlan` (`GET /api/memberships/plans?locale=`, `GET /api/memberships/me`, `POST /api/memberships/subscribe` / `cancel`). Pago por transferencia y/o site credit, igual que el checkout de productos: el backend no tiene flujo de tarjeta para membresías.
2. i18n: **en/es/pt/fr/zh — sin árabe** (el storefront tiene 6 locales en `src/lib/i18n.ts`, un objeto anidado de 4115 líneas; el español se portó de ahí manteniendo el voseo). Diccionario propio en `src/i18n/` (`en.ts` como fuente de verdad; `es.ts`/`pt.ts`/`fr.ts`/`zh.ts` tipados contra él, así una clave faltante es error de compilación), `I18nProvider` + `useT()`/`useI18n()`, idioma persistido en SecureStore (`mp_locale`) con default según el idioma del dispositivo, selector en el perfil. Fechas y montos salen por `dateLocale` (en-US / es-AR / pt-BR / fr-FR / zh-CN). Pendiente solo `ar`: es RTL y obliga a revisar todos los layouts, no es solo traducir.
3. Deep linking + Universal Links — **implementado en código, falta configurar**:
   - **App**: `ios.associatedDomains` en `app.json` (`maisonpriveeatelier.com` y `www.`). `app/+native-intent.tsx` + `src/lib/deepLinks.ts` reescriben las rutas web en español a las rutas de la app: `/products/:id` → `/product/:id`, `/vende` → `/sell`, `/refer-a-seller` → `/refer`, `/mis-pedidos` → `/orders`, `/membership` y `/subscription` → `/membership`, `/profile?tab=purchases|consignments|subscription|wishlist` → la pantalla equivalente, `/checkout` → `/cart`. El scheme propio `maisonprivee://order/:id/confirmed` (retorno del pago con tarjeta) va a `/orders/:id`.
   - **Referidos**: un `?ref=` en cualquier link entrante se guarda en SecureStore (`mp_ref`, igual que el `localStorage` del storefront) y se manda como `referredBy` en el registro; después se borra.
   - **Storefront**: `storefront/src/app/.well-known/apple-app-site-association/route.ts` sirve el AASA como JSON. Solo se reclaman las rutas que tienen pantalla nativa; admin y checkout quedan en la web. Devuelve 404 mientras no exista `APPLE_TEAM_ID`.
   - **Pendiente (manual)**: (a) cargar `APPLE_TEAM_ID` (developer.apple.com → Membership) en el servicio storefront de Easypanel y redeployar; (b) verificar que `https://maisonpriveeatelier.com/.well-known/apple-app-site-association` y la versión con `www.` respondan 200 sin redirect (si `www` redirige al dominio sin `www`, Apple no sigue el redirect: sacar `www` de `associatedDomains`); (c) el App ID tiene que tener la capability *Associated Domains*: EAS la habilita sola en el primer build si maneja las credenciales. iOS descarga el AASA al instalar la app, así que después de corregirlo hay que reinstalar.
4. QA en dispositivo real vía TestFlight — **`eas.json` listo, solo para iOS**: `development` (simulador), `preview` (distribución interna por ad hoc, requiere registrar el UDID del iPhone con `eas device:create`) y `production` (App Store/TestFlight, `autoIncrement` del build number con `appVersionSource: remote`). La URL de la API de producción está en `build.base.env` porque `.env` está en `.gitignore` y EAS no lo sube. `ITSAppUsesNonExemptEncryption: false` en `app.json` evita la pregunta de export compliance en cada build.
   Pasos (requieren la cuenta Apple Developer aprobada):
   ```
   eas login
   eas init                       # crea el proyecto EAS y escribe extra.eas.projectId en app.json (lo necesitan los push)
   eas credentials -p ios         # certificados + perfil, y subir la APNs Key (.p8) para los push
   eas build -p ios --profile production
   eas submit -p ios --latest     # sube a App Store Connect → TestFlight
   ```
   Checklist de QA en el iPhone:
   - Login/registro, refresh de sesión tras 30+ min en background, logout.
   - Catálogo con filtros, detalle, wishlist y carrito (persistencia al cerrar la app).
   - Checkout por transferencia con comprobante (cámara y galería), cupón y site credit.
   - Mis pedidos y detalle; push cuando el admin cambia el estado de la orden.
   - Consignación con fotos, mis consignaciones, ofertas recibidas (aceptar/rechazar).
   - Membresía: ver planes, suscribirse por transferencia, estado pendiente/activo, cancelar.
   - Cambio de idioma en los 5 locales, sin textos cortados en pantallas chicas (iPhone SE).
   - Universal Links: abrir desde Notas o Mensajes (no desde Safari escribiendo la URL) `/products/<id>`, `/vende?ref=<userId>` y registrarse para confirmar que el referido queda atribuido, y `/mis-pedidos`.

## Alternativas a no tener hardware Apple (aplican en todas las fases)

| Necesidad | Solución sin Mac |
|---|---|
| Compilar `.ipa` | `eas build --platform ios` (macOS cloud de Expo, gestiona certificados automáticamente) |
| Subir a TestFlight/App Store | `eas submit -p ios` |
| Probar en iPhone real | TestFlight (cualquier iPhone prestado) o BrowserStack App Live / Sauce Labs (acceso remoto a iPhones reales por navegador) |
| Debug interactivo con Xcode | MacStadium / MacinCloud (Mac remota por hora/mes) — última opción, no debería hacer falta en Expo managed |
| CI/CD alternativo | Codemagic o GitHub Actions con runner `macos-latest` |
| Cuenta Apple Developer | Se paga online con tarjeta, sin hardware — USD 99/año |

## Puntos clave / precauciones

- **Apple Developer Program (USD 99/año) es individual o de organización** — hay que decidir esto antes de crear la cuenta. Cambiar de individual a organización después implica recrear certificados, provisioning profiles y perder el historial de TestFlight. Si Maison Privée es una empresa constituida, conviene inscribirse como organización desde el día uno (requiere D-U-N-S number, puede tardar días en validarse — arrancar este trámite en paralelo a Fase 0, no después).
- **App Store Review rechaza apps que sean "solo un WebView"** (guideline 4.2 de App Store Review Guidelines). La Opción A de pagos (abrir el checkout web en `expo-web-browser`) es aceptable porque es un flujo de pago puntual dentro de una app nativa con funcionalidad propia — pero si terminás envolviendo *toda* la experiencia en vistas web (catálogo, perfil, etc.) en vez de solo el checkout, el riesgo de rechazo es real. Mantené catálogo, carrito, perfil, ofertas y consignación como pantallas nativas de verdad.
- **In-App Purchase (IAP) de Apple**: si en algún momento se vende algo digital/membresía *dentro* de la app (no productos físicos), Apple exige usar su sistema de compras (IAP, con 15-30% de comisión) y prohíbe links a pago externo para ese tipo de compra. Los productos físicos de moda de lujo y la membresía (que da acceso a comprar productos físicos) están en la categoría de "bienes y servicios físicos" y quedan exceptuados de IAP — pero conviene revisar el copy exacto de qué incluye `MembershipPlan` antes de publicar, porque si Apple interpreta que es "contenido digital" el review puede pedir IAP y bloquear el lanzamiento.
- **Certificado/key de APNs**: aunque Expo abstrae el envío de push vía su servicio, igual hace falta generar una APNs Auth Key (`.p8`) desde el portal de Apple Developer y subirla a EAS (`eas credentials`) — es un trámite de una sola vez, sin Xcode, pero requiere acceso al portal de developer con la cuenta ya aprobada.
- **Universal Links exige un dominio real bajo tu control** con `apple-app-site-association` servido por HTTPS sin redirects — si `maisonpriveeatelier.com` cambia de proveedor/CDN en el medio del proyecto, hay que re-verificar el archivo o los deep links de referidos y confirmación de pago dejan de abrir la app.
- **Un solo backend sirviendo dos clientes (web + iOS)**: cualquier cambio de contrato de API (renombrar un campo, cambiar un shape de respuesta) rompe silenciosamente al cliente que no se está mirando en ese momento. No hay tests de contrato ni un esquema OpenAPI documentado hoy — considerar escribir tests de integración mínimos sobre los endpoints que consume mobile antes de tocarlos, o al menos revisar manualmente el storefront web después de cada cambio de backend.
- **Rate limiting global** (1000 req/15min prod) está pensado para tráfico web de un sitio, no para el patrón de polling que suelen tener las apps mobile (refetch al volver a foreground, retry automático de React Query). Si la app agrega mucho polling, revisar que no se pise con el límite compartido — separar el rate limit por origen/cliente si hace falta.
- **Nombre y assets de la app**: el ícono, splash screen y nombre en el App Store son un trámite de marca (puede haber conflicto de nombre "Maison Privée" ya tomado por otra app) — chequear disponibilidad del nombre en App Store Connect temprano, no al final.
- **Tiempo de review de Apple**: primera submission puede tardar 24-48hs pero también puede haber rechazos por metadata/capturas de pantalla incompletas que agregan días — no asumir que el lanzamiento es inmediato después del último build.

## Migración de base de datos: qué hace falta y qué no

**No hace falta migrar de base de datos ni de proveedor.** La app iOS es un cliente nuevo de la misma API y la misma Postgres — no hay "migración de datos" en el sentido de mover información de un sistema a otro. Lo que sí hace falta son **migraciones de esquema (Prisma) aditivas**, todas con `npx prisma migrate dev` en local y luego el script SQL correspondiente corrido a mano en producción (Easypanel), según el flujo que ya usa este proyecto (no hay entorno de staging, así que probar bien en local/dev antes):

1. **Tabla de refresh tokens** (Fase 1.1) — nueva tabla, no toca datos existentes:
   ```sql
   CREATE TABLE "RefreshToken" (
     "id" TEXT PRIMARY KEY,
     "userId" TEXT NOT NULL REFERENCES "User"("id"),
     "tokenHash" TEXT NOT NULL,
     "platform" TEXT NOT NULL DEFAULT 'ios',
     "expiresAt" TIMESTAMP NOT NULL,
     "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
     "revokedAt" TIMESTAMP
   );
   ```
   (Ajustar tipos exactos según el resto del schema — `cuid()` para el id, igual que las demás tablas.)
2. **Campo `platform` + `expoPushToken` en `PushSubscription`** (Fase 1.2) — columnas nuevas, nullable, no rompe filas existentes:
   ```sql
   ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "platform" TEXT DEFAULT 'web';
   ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "expoPushToken" TEXT;
   ```
3. **`GET /api/consignment/mine`** (Fase 3.4, si no existe ya) — no requiere migración, es solo un endpoint nuevo sobre datos ya existentes (`Consignment.userId`).

**Lo que explícitamente NO hace falta**: no hay que tocar `Product`, `Order`, `OrderItem`, `Offer`, `Consignment`, `MembershipPlan` ni ningún otro modelo de negocio — el catálogo, las órdenes y los flujos de compra son idénticos entre web y mobile, mismo shape de datos. Tampoco hace falta separar bases de datos por cliente ni versionar la API (`/v1`, `/v2`) a menos que en el futuro el contrato de mobile diverja mucho del web — con 2-3 endpoints nuevos aditivos no se justifica ese costo todavía.

## Checklist de "no romper nada del lado web"

Como el backend se comparte entre storefront web y app mobile, cualquier cambio de Fase 1 debe mantener retrocompatibilidad con el storefront actual:
- Los nuevos endpoints (`/refresh`, `/logout`, push de usuario) son aditivos, no reemplazan los existentes.
- Si se elige Opción B de pagos (Checkout Pro), decidir si el storefront web migra también o queda con su flujo actual de Orders API — pueden convivir ambos, pero implica mantener dos integraciones de MP en paralelo.
- Correr la migración Prisma de refresh tokens contra un entorno de staging antes de aplicarla a producción (no hay entorno de staging documentado hoy — considerar crear uno si no existe).
