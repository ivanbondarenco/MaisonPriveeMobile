# iOS release runbook (blocked on the Apple Developer account)

Status: the app is ready to build, but nobody has an Apple Developer Program membership yet. `eas build --profile production --platform ios` stops at "Do you want to log in to your Apple account?" because signing credentials can only be issued to a program member. Everything below is what remains, in order. Read it fully before running any `eas` command.

Testing on a phone with Expo Go does NOT need any of this.

## What is already done

- EAS project linked: `extra.eas.projectId` = `83ca0642-4e65-4f17-ae9d-20c241dfd732`, `owner` = `ignaciosena` (an Expo account, see "Access" below).
- OTA updates configured (`expo-updates`): `runtimeVersion.policy: "fingerprint"`, `updates.url` set, one channel per build profile in `eas.json` (`development`, `preview`, `production`).
- `ios.bundleIdentifier`: `com.maisonpriveeatelier.mobile`. `ITSAppUsesNonExemptEncryption: false` (export compliance answered).
- `eas.json` production profile: `distribution: "store"`, `autoIncrement: true`, `appVersionSource: "remote"` (EAS manages build numbers).
- In-app account deletion (required by App Store Review Guideline 5.1.1(v)) is implemented in the app; its backend endpoint `DELETE /users/me` ships with the web branch `feat/mobile-sync`.

## Step 0: access

1. **Expo:** the EAS project belongs to the Expo account `ignaciosena`. Whoever runs builds must be a member of that project (expo.dev, project settings, Members; or move the project to an Expo organization both people belong to). Without it `eas build` fails with a permissions error.
2. **Apple:** see Step 1. If the Apple account belongs to someone else, that person invites the builder in App Store Connect, Users and Access, with role **Admin** (needed for EAS to create certificates and the push key).

## Step 1: enroll in the Apple Developer Program

Fee: 99 USD per membership year (may be shown in local currency). Renew yearly or the app is removed from the App Store.

Decide first, it is permanent and public: the enrollment type sets the **seller name shown on the App Store**.

| | Individual | Organization |
|---|---|---|
| Seller name | The person's legal name | The company's legal name |
| D-U-N-S number | Not needed | Required |
| Entity | Any adult | Legal entity able to sign contracts (in Argentina: SA, SRL, SAS). DBAs, trade names and branches are rejected. A sole proprietorship (monotributo) counts as an individual. |
| Email | Any, with two-factor auth on the Apple Account | Work email on the company domain (e.g. `@maisonpriveeatelier.com`) |
| Website | Not needed | Public, working site on the company domain |
| Who enrolls | The person | Someone with legal authority to bind the company |

Recommendation: enroll as the **organization** (Maison Privee Atelier) so the app is not tied to one person. Moving an app from an individual account to a company account later is possible but slow.

Organization steps:
1. Look up or request the D-U-N-S number with Apple's tool: https://developer.apple.com/enroll/duns-lookup/ . Free. Dun & Bradstreet takes up to 5 business days to issue it, then Apple needs up to 2 more business days to see it.
2. Apple Account with two-factor authentication, ideally on the company email.
3. Enroll from the Apple Developer app on an iPhone (fastest, verifies identity on the device) or at https://developer.apple.com/programs/enroll/ . Use legal first and last names, no aliases.
4. After approval: accept the license agreement and pay.
5. Copy the **Team ID** (developer.apple.com, Account, Membership details). It is needed in Step 5.

## Step 2: decisions before the first build

These change native config, so settle them before the first store build (changing them later needs a new build, not an OTA update). Ask the project owner; do not decide alone.

- `ios.supportsTablet` is `true`. App Review will then require iPad screenshots and review the iPad layout. If the app is not designed for iPad, set it to `false`.
- `android.permissions` contains `RECORD_AUDIO`, which nothing in the app uses. The app is iOS-only; confirm with the owner and remove it.
- `ios.associatedDomains` lists both domains twice. Harmless, but dedupe it.

## Step 3: production environment variables on EAS

`eas update` does NOT read the `env` block in `eas.json`; it reads EAS environment variables. Local `.env` points at a LAN dev machine, so a missing variable here would ship an update pointing at it.

```powershell
eas env:list --environment production
# If EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SITE_URL are missing:
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.maisonpriveeatelier.com/api --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SITE_URL --value https://maisonpriveeatelier.com --visibility plaintext
# Same two for --environment preview
```

## Step 4: build, submit, TestFlight

Pre-check: the web branch `feat/mobile-sync` must be deployed, and `npm run check:api` (or the "API contract" GitHub Action) must be green against production.

```powershell
npm install -g eas-cli
eas login
eas build --profile production --platform ios
```
- "Do you want to log in to your Apple account?" -> **Y**, sign in with the Apple Account of the team (or the invited Admin).
- Let EAS generate the distribution certificate and provisioning profile.
- When offered, **create the Apple Push Notifications key** (the app uses `expo-notifications`).

```powershell
eas submit --profile production --platform ios
```
Uploads the build to App Store Connect and creates the app record if needed. Then install the TestFlight app on an iPhone and test the real signed build before sending it to review.

## Step 5: universal links (web repo)

In the storefront service env (Easypanel) set `APPLE_TEAM_ID=<Team ID from Step 1>` and redeploy the storefront. Verify:
```bash
curl -s https://maisonpriveeatelier.com/.well-known/apple-app-site-association
# Must return JSON with appIDs ["<TEAMID>.com.maisonpriveeatelier.mobile"], no redirect. It returns 404 while APPLE_TEAM_ID is unset.
```

## Step 6: App Store Connect listing and review

App Review will ask for:
- **Privacy Policy URL.** The website's legal pages (Terms, Privacy) are still unfilled; publish them first. This blocks submission.
- **App Privacy questionnaire:** data collected (account details, contact info, addresses for shipping, photos the user uploads, purchase history) and its use.
- **Screenshots** for the required iPhone sizes (and iPad if `supportsTablet` stays `true`).
- **Demo account** with sign-in credentials for the reviewer (much of the app needs a session), ideally with an order and a consignment.
- **Support URL** and description, keywords, category.
- **Payments rule:** physical goods paid by bank transfer are fine without Apple In-App Purchase. Selling digital content or paid memberships inside the app would require In-App Purchase (Guideline 3.1.1). Today the in-app membership (Private Client Registry) is free, so nothing to do; keep it that way unless IAP is added.

## After release

- JS/UI changes: `npm run update:production -- --message "<what changed>"` (OTA, reaches users in minutes, no review).
- Native changes (new native library, permissions, plugins, `app.json` native fields): new `eas build` + `eas submit`. The fingerprint runtime policy keeps OTA updates from reaching builds they are incompatible with.
- Apple may reject OTA use that changes the app's primary purpose; use OTA for fixes and improvements.

## References

- https://developer.apple.com/programs/enroll/
- https://developer.apple.com/help/account/membership/D-U-N-S/
- https://developer.apple.com/help/account/membership/enrolling-in-the-app/
- https://docs.expo.dev/eas-update/getting-started/
