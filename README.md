# maraakuko.app landing site

Static site deployed to Cloudflare Pages that serves:

1. **Article share fallback** at `https://maraakuko.app/article/<id>` for users without the app installed.
2. **iOS Universal Link verification** via `/.well-known/apple-app-site-association`.
3. **Android App Link verification** via `/.well-known/assetlinks.json`.
4. **Root marketing page** at `https://maraakuko.app/`.
5. **Legal & policy pages** at `https://maraakuko.app/legal/<slug>/` — the canonical, hosted versions of the app's 9 policies (see [Legal pages](#legal-pages) below).

When the Mara Akụkọ Flutter app is installed and the user taps `https://maraakuko.app/article/<id>` from any source (chat app, browser, email, push notification), iOS UL / Android App Link intercepts and opens the in-app `/article/<id>` route directly. This static site only renders for non-installed devices.

## Files

| Path | Purpose |
|---|---|
| `.well-known/apple-app-site-association` | iOS Universal Link manifest. JSON, no extension, served as `application/json`. |
| `.well-known/assetlinks.json` | Android App Link manifest. JSON, served as `application/json`. |
| `_headers` | Cloudflare Pages config: enforces `Content-Type: application/json` on the `.well-known/*` files and sets a 1-hour cache on `/legal/*`. |
| `_redirects` | Routes `/article/*` to `article-fallback.html`, plus trailing-slash rewrites for `/legal/*` (auto-managed block — see below). |
| `article/index.html` | Per-article landing page. Detects platform via UA, redirects to store after 1s, with "Continue in Browser" escape hatch. |
| `index.html` | Marketing root. Links to `/legal/`. |
| `legal/index.html` | Index of all policies. **Generated** — do not edit by hand. |
| `legal/<slug>/index.html` | One hosted policy page per slug (privacy-policy, terms-of-service, eula, …). **Generated** — do not edit by hand. |

## Legal pages

The 9 pages under `/legal/` are **generated from the app's single source of
truth** — `lib/features/legal/data/legal_documents.dart` in the main app repo
— by `scripts/gen_legal_pages.py` (in that repo, **not** here). This keeps the
hosted text byte-identical to what users read inside the app.

> ⚠️ **Never hand-edit `legal/` or the marked legal block in `_redirects`.**
> Both are regenerated and your edits will be overwritten. To change wording,
> edit `legal_documents.dart` in the app repo, re-run the generator, then
> commit + push the regenerated files here.

**Regenerate** (run from the app repo root, which has this folder checked out
alongside it):

```bash
python scripts/gen_legal_pages.py
```

It writes `legal/<slug>/index.html` + `legal/index.html`, and rewrites the
`# --- … generated legal routes … ---` block in `_redirects` (the root and
`/article/*` rules are left untouched). Each page's URL slug comes from its
`canonicalUrl` in the Dart file, so `https://maraakuko.app/legal/<slug>/`
always matches the in-app "View canonical version online" link.

The pages are the app's **canonical** legal home: the App Store / Play
"Privacy Policy URL" and the `DMCA_POLICY_URL` Convex env var should point at
the matching `https://maraakuko.app/legal/<slug>/`.

> The policy text is accurate-as-of-codebase placeholder pending counsel
> sign-off. When counsel finalizes wording, update `legal_documents.dart`,
> re-run the generator, and re-deploy.

## Deploy steps

### 1. Fill the placeholders

Three placeholders must be replaced with real values before this site is useful:

**`.well-known/apple-app-site-association`**:
- `REPLACE_WITH_APPLE_TEAM_ID` — your 10-character Apple Developer Team ID. Find at https://developer.apple.com → Membership.

**`.well-known/assetlinks.json`**:
- `REPLACE_WITH_DEBUG_SHA256_COLON_SEPARATED` — SHA-256 of your local debug keystore. Run:
  ```bash
  keytool -list -v \
    -keystore $HOME/.android/debug.keystore \
    -alias androiddebugkey -storepass android -keypass android \
    | grep "SHA256:"
  ```
  (On Windows: `keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android`.) Copy the colon-separated fingerprint.

- `REPLACE_WITH_RELEASE_SHA256_COLON_SEPARATED` — SHA-256 of your Play Store upload keystore. Same command, with the release keystore path + alias + passwords. If a release keystore doesn't exist yet, leave the placeholder in for now — Play Store autoVerify won't work until a release build is signed and uploaded, but debug-build App Links will verify from the first entry.

**`article/index.html`** — once the app is listed in the stores, update `APP_STORE_URL` and `PLAY_STORE_URL` at the top of the `<script>` block.

### 2. Push to a GitHub repo

The Cloudflare Pages integration deploys from a connected repo. Either:
- Push this folder as its own repo, or
- Add it as a subdirectory of an existing repo with build root pointed at this folder.

### 3. Set up Cloudflare Pages

1. Cloudflare dashboard → Workers & Pages → Create application → Pages → Connect to Git.
2. Pick the repo + branch.
3. Build settings:
   - Build command: (leave empty — pure static)
   - Build output directory: `/` (or the subdirectory path)
4. Deploy. Note the `*.pages.dev` URL Cloudflare assigns.

### 4. DNS + custom domain

1. Cloudflare dashboard → DNS → register `maraakuko.app` (or transfer in if registered elsewhere).
2. Pages → Custom domains → `maraakuko.app` → follow the CNAME / apex setup prompts.
3. Cloudflare auto-provisions an SSL cert. Wait ~2 minutes for propagation.

### 5. Verify

```bash
# 1. AASA file — must return 200 + application/json + valid JSON
curl -v https://maraakuko.app/.well-known/apple-app-site-association

# 2. assetlinks — same
curl -v https://maraakuko.app/.well-known/assetlinks.json

# 3. Article landing page — must return 200 (any /article/<id> path)
curl -v https://maraakuko.app/article/test-id
```

External validators:
- Apple Universal Links: https://branch.io/resources/aasa-validator/
- Google Asset Links: https://developers.google.com/digital-asset-links/tools/generator

## Updating the file

iOS re-fetches AASA only on app install/upgrade. Android re-verifies assetlinks on install + when you manually trigger verification. So:

- **Adding a new app or path** (e.g., supporting a second bundle id) → update the JSON, deploy. New installs pick it up immediately; existing installs require a new app build for iOS, a verification reset for Android (`adb shell pm verify-app-links --re-verify <package>`).
- **Changing the Apple Team ID** → invalidates AASA for users on the old build. Coordinate the rollout: keep both Team IDs in the JSON during the transition.
- **Changing the Android signing key** → add the new SHA-256 to the array. Don't replace the old one until the previous release is sunset.
