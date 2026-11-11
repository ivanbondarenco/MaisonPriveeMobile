# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# iOS release

Building, submitting or publishing the iOS app (any `eas build`, `eas submit`, `eas update`, App Store Connect or Apple Developer task) is blocked on an Apple Developer account that does not exist yet. Before doing any of it, read [docs/APP_STORE_RELEASE.md](docs/APP_STORE_RELEASE.md) and follow its steps in order.

# Backend contract

This app shares its backend with the website (repo `MaisonPrivee`). What the app reads from the API is defined in `src/api/contract.ts`; keep it in step with `src/api/types.ts` and with `docs/MOBILE_APP_CONTRACT.md` in the web repo. Check the live API with `npm run check:api`.
