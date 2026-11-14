# TradeMind ICT v5 – From your PC to Google Play

Work through these steps in order. Each step ends with something you can check.
Placeholders like `[YOUR SUPPORT EMAIL]` are yours to fill in.

---

## Step 0 – Accounts you need (all free except Google Play)

| Account | Why | Cost |
|---|---|---|
| GitHub (github.com) | Safe copy of your code + hosts your privacy policy | Free |
| Expo (expo.dev) | Builds the Android app in the cloud (EAS) | Free tier |
| Supabase (supabase.com) | Login, cloud sync, cloud alerts | Free tier |
| Firebase (console.firebase.google.com) | Delivers push notifications on Android | Free |
| Google Play Console (play.google.com/console) | Publish the app, sell Pro | **$25 once** |
| RevenueCat (revenuecat.com) | Manages Pro subscriptions | Free until you earn more than RevenueCat's free threshold |

---

## Step 1 – Update the project (cmd)

```
cd C:\Users\Kelvin\Desktop\SMC-ICT-Journal
robocopy . ..\TradeMind-v4-backup /E /XD node_modules .expo
tar -xf C:\Users\Kelvin\Downloads\trademind-app-v5.zip
npx expo install @supabase/supabase-js react-native-url-polyfill expo-notifications expo-device expo-constants react-native-purchases expo-build-properties expo-image-picker expo-splash-screen
npx expo start
```

The zip replaces `App.js`, `app.json` and `src\`, and adds `assets\`, `docs\`, `supabase\` and `eas.json`.
**Check:** the app opens in Expo Go and your trades are still there. Pro is unlocked (beta).

> If your old `app.json` had settings you added yourself, compare with `..\TradeMind-v4-backup\app.json`.

---

## Step 2 – Put the code on GitHub and publish the legal pages

1. Install Git for Windows (git-scm.com), then in cmd:
   ```
   cd C:\Users\Kelvin\Desktop\SMC-ICT-Journal
   git init
   git add .
   git commit -m "TradeMind ICT v5"
   ```
2. On github.com create a repository called `trademind-ict` (Private is fine for code).
   Follow GitHub's "push an existing repository" commands it shows you.
3. Legal pages: GitHub Pages needs a **public** repo. Easiest: create a second public repo
   `trademind-legal`, upload the 4 files from the `docs` folder, then
   Settings → Pages → Branch: `main` / root → Save.
4. Open the 4 pages, replace every `[...]` placeholder (Edit on GitHub), and put the URLs in
   `src\config.js`:
   ```js
   export const PRIVACY_URL = "https://YOURNAME.github.io/trademind-legal/privacy.html";
   export const TERMS_URL   = "https://YOURNAME.github.io/trademind-legal/terms.html";
   export const SUPPORT_EMAIL = "you@example.com";
   ```
**Check:** the privacy page opens on your phone's browser.

---

## Step 3 – Supabase (login + sync)

1. supabase.com → New project → name `trademind`, a strong database password, region closest to
   your users.
2. **SQL Editor → New query →** paste all of `supabase\schema.sql` → **Run**. ("Success. No rows returned" is correct.)
3. **Authentication → Sign In / Providers → Email:** keep "Confirm email" ON.
   **Authentication → URL Configuration → Site URL:** your GitHub Pages index URL.
4. **Project Settings → API:** copy the **Project URL** and the **anon public** key into
   `src\config.js`:
   ```js
   export const SUPABASE_URL = "https://xxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJ...";
   ```
   Never put the `service_role` key in the app.
5. Restart `npx expo start`. In the app: Settings → Cloud account → Create account → confirm the
   email → Sign in.

**Check:** Settings shows "Synced ..." and in Supabase → Table Editor → `trades` you see your trades.
Sign in on a second phone with the same account – your journal appears there too.

---

## Step 4 – The PC scanner talks to the cloud

In `trademind-bot\config.py`:
```python
CLOUD_SUPABASE_URL = "https://xxxx.supabase.co"
CLOUD_SUPABASE_ANON_KEY = "eyJ..."
CLOUD_EMAIL = "your app login email"
CLOUD_PASSWORD = "your app password"
```
Then `python scan_signals.py`. It prints `Cloud relay: ON` and, every 10 minutes, adds your new
closed MT5 trades to your journal. Alerts appear in the app even away from home.
**Check:** Supabase → Table Editor → `alerts` fills up; the app shows "Cloud alerts on".

---

## Step 5 – Build the real Android app (APK)

```
npm install -g eas-cli
eas login
eas init
eas build -p android --profile preview
```
`eas init` links the project to your Expo account (it adds a `projectId` to `app.json`).
The build runs in Expo's cloud (10–20 min) and gives you a link/QR code to an `.apk`.
Install it on your phone (allow "install unknown apps" for your browser).

**Check:** "TradeMind ICT" with the candle icon is on your home screen and works without Expo Go.

> The package name is `com.trademindict.app` (in `app.json`). Change it **before** your first
> Google Play upload if you want something else – it can never change afterwards.

---

## Step 6 – Push notifications (Firebase)

1. Firebase console → Add project `trademind` → Add app → **Android** → package
   `com.trademindict.app` → download `google-services.json` into the project folder.
   (This file is not secret and must be committed to git – EAS only builds files git tracks.)
2. In `app.json`, inside `"android": { ... }` add: `"googleServicesFile": "./google-services.json",`
3. Firebase → Project settings → Service accounts → **Generate new private key** (JSON file).
4. `eas credentials` → Android → production → **Google Service Account → FCM V1** → upload that JSON.
5. Build again: `eas build -p android --profile preview`, install, then in the app:
   Settings → Cloud account → **Turn on alert notifications**.

**Check:** when the scanner finds a setup, your phone shows a notification (app closed or open).

---

## Step 7 – Google Play Console

1. Create the developer account ($25), verify your identity.
2. **Create app:** name TradeMind ICT, App, Free (Pro is an in-app subscription).
3. **Store listing:** short and full description, icon `assets\play-icon-512.png`,
   feature graphic `assets\play-feature-graphic.png`, at least 2 phone screenshots.
4. **App content:**
   - Privacy policy: your `privacy.html` URL
   - App access: give reviewers a test login (create a test account)
   - Ads: No
   - Content rating questionnaire
   - Target audience: 18+
   - **Data safety:** collects Email (account management), App activity/financial-info-style
     user content = trades you enter (app functionality, not shared, encrypted in transit,
     user can request deletion), Crash logs (app diagnostics), Device ID = push token
     (app functionality). Data is not sold.
   - **Account deletion:** in-app path + URL of `delete-account.html`
   - Financial features declaration: the app is a journal; it does not offer trading,
     loans, payments or investment advice.
5. Production build and upload:
   ```
   eas build -p android --profile production
   ```
   Download the `.aab` and upload it in **Testing → Closed testing → Create release**.

### The 12-tester rule
New personal developer accounts must run a **closed test with at least 12 testers opted in
for 14 days in a row** before production access. Create a Google Group with 15–20 trader
friends, add it as the closed-test tester list, send them the opt-in link, and keep them
using the app for 14 days. Then apply for production in the Play Console dashboard.

---

## Step 8 – Pro subscriptions

1. Play Console → **Monetize → Subscriptions** (available after your first upload):
   create `pro_monthly` and `pro_yearly` with base plans and prices (KES pricing is set per
   country; Google Play accepts M-Pesa in Kenya).
2. RevenueCat → new project → **Android app** with package `com.trademindict.app`, upload a
   Google Play service-account JSON (RevenueCat's guide walks through this).
3. RevenueCat → **Entitlements:** create `pro`, attach both products.
   **Offerings:** a `default` offering with Monthly and Annual packages.
4. Copy the **Android public API key** (`goog_...`) into `src\config.js`:
   `export const REVENUECAT_ANDROID_KEY = "goog_...";`
5. Play Console → Settings → **License testing:** add your Gmail so test purchases are free.
6. Rebuild, install from the closed test, open Settings → Get Pro and buy with your tester account.
7. When you are ready to charge real users: set `PRO_FREE_DURING_BETA = false`, rebuild,
   upload the new version.

**Free vs Pro in the app**
- Free: journal, checklist, position sizing, partial closes, reviews, basic stats, reports,
  backups/CSV, PIN, Wi-Fi scanner alerts.
- Pro: cloud sync, MT5 import, cloud alerts + push, calendar, R distribution and the
  weekday/hour/emotion/plan/mistake breakdowns.

---

## Step 9 – Releasing updates

Change the code → test in Expo Go → `git commit` → `eas build -p android --profile production`
→ upload the new `.aab` to the same track. `autoIncrement` raises the build number for you;
raise `"version"` in `app.json` (1.0.0 → 1.1.0) for users to see.

---

## Important

- Keep `config.py` (it holds your password) and any **service-account** JSON files (Firebase
  private key, Google Play key) **out of git**. The included `.gitignore` already excludes them.
- Do not market scanner alerts as signals or profits. The app is a journal; publishing trade
  signals to the public may need Capital Markets Authority (Kenya) licensing – ask a lawyer first.
- Kenya Data Protection Act: once you hold other people's data, check with the Office of the
  Data Protection Commissioner whether you must register.
