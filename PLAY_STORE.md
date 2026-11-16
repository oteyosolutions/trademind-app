# TradeMind ICT – Play Store release kit (personal developer account)

Personal Play accounts must run a **closed test with at least 12 testers for 14 days in a row** before
Google lets you publish to everyone. Plan: closed test now → production in about 3 weeks.

---

## 1. Before you build (30 min)

1. **Fill the two placeholders** in `docs\privacy.html`, `docs\terms.html`, `docs\delete-account.html`,
   `docs\index.html`: replace `[YOUR NAME]` and `[YOUR SUPPORT EMAIL]` (Notepad → Ctrl+H → Replace All).
   Use a support email you will actually read.
2. **Publish the pages** (free, GitHub Pages – see DEPLOY.md Step 2). You get links like
   `https://YOURNAME.github.io/trademind/privacy.html`.
3. In `src\config.js` fill `PRIVACY_URL`, `TERMS_URL` (those links) and `SUPPORT_EMAIL`.
4. Keep `PRO_FREE_DURING_BETA = true` during the closed test (no payments yet).
5. **Cloud functions** (Supabase dashboard):
   - SQL Editor → run `supabase\calendar.sql`.
   - Edge Functions → Deploy a new function → Via editor → name `calendar` → paste
     `supabase\functions\calendar\index.ts` → Deploy → Settings: turn OFF "Verify JWT with legacy secret".
   - Authentication → URL Configuration → Site URL: your GitHub Pages address (so email links open a real page).
   - Authentication → Sign In / Providers → Email: decide on "Confirm email" (ON is better for a public app).
6. **Create a reviewer account** in the app (e.g. `review.trademind@gmail.com` + a password).
   Google's reviewers use it to see the cloud features.

## 2. Build the release (20–40 min, in Expo's cloud)

```
cd %USERPROFILE%\Desktop\SMC-ICT-Journal
eas build -p android --profile production
```
This makes an **.aab** (Android App Bundle) – the format Google Play needs. Download it from the link
at the end (or expo.dev → your project → Builds). Version numbers go up automatically each build.

## 3. Create the app in Play Console

play.google.com/console → **Create app**
- App name: **TradeMind ICT – Trading Journal**
- Default language: English (United Kingdom or United States)
- App or game: **App** · Free or paid: **Free** (Pro is an in-app subscription later)
- Tick the declarations → Create app

## 4. Store listing (Grow → Store presence → Main store listing)

**Short description (80 characters max):**
```
SMC/ICT trading journal: log trades, find your edge, keep your risk in check.
```

**Full description:**
```
TradeMind ICT is a trading journal built for Smart Money Concepts and ICT traders.

LOG EVERY TRADE IN SECONDS
• Pair, direction, entry, stop, target, lot size and risk – the app calculates R for you
• Setup, session, killzone, liquidity, emotions, mistakes and notes
• Attach chart screenshots before and after

KNOW YOUR NUMBERS
• Win rate, average R, profit factor, drawdown and equity curve
• Results by session, setup, pair, weekday and hour
• Built-in trade coach: a weekly review, where you lose money, where your edge is,
  revenge trading, overtrading and cutting winners early – from your own journal, offline

STAY DISCIPLINED
• Pre-trade ICT checklist with a score for every trade
• Position-size calculator in your account currency
• Market clock: Asia, London and New York sessions, overlaps and killzones in your own time zone
• Economic calendar with this week's high-impact news

YOUR DATA, YOUR WAY
• Works fully offline – nothing leaves your phone unless you create an account
• Optional cloud sync between devices, PIN lock, backups and CSV export
• Delete your account and cloud data any time from the app

TradeMind ICT is a journal and education tool. It does not give financial advice, does not execute trades
and never asks for your broker password. Trading forex, gold and indices carries a high risk of loss.
```

**Graphics:**
- App icon: `assets\play-icon-512.png` (512×512)
- Feature graphic: `assets\play-feature-graphic.png` (1024×500)
- Phone screenshots (2–8): take them on your phone from Home (market clock), New Trade, Journal,
  Analysis (coach) and Checklist. Use demo trades – no real account numbers or balances.

**Category:** Finance · **Contact email:** your support email · **Privacy policy:** your privacy.html link

## 5. App content (Policy → App content) – suggested answers

| Section | Answer |
|---|---|
| Privacy policy | your `privacy.html` link |
| Ads | **No ads** |
| App access | Some features need an account → **add the reviewer login** from step 1.6 |
| Content rating | Questionnaire, category *Utility/Productivity/Other*: no violence, no gambling, no user-to-user chat, no location sharing → usually rated *Everyone/3+*. Answer honestly. |
| Target audience | **18 and over** only |
| News app | No |
| Data safety | see table below |
| Financial features | The app **does not** provide banking, loans, payments, crypto wallets or trade execution – it is a journal. Pick the option that says the app does not provide financial features (or the closest "other / information only" option). Answer truthfully; do not tick trading services. |
| Government app | No |
| Health | None |
| Account deletion | In-app: Settings → Cloud account → Delete account. Web link: your `delete-account.html` |

**Data safety form:**

| Data type | Collected? | Purpose | Optional? |
|---|---|---|---|
| Email address | Yes (only with a cloud account) | Account management | Yes |
| User IDs | Yes (account ID) | Account management | Yes |
| Financial info → Other financial info (your trade records, balance) | Yes (only if you sync) | App functionality | Yes |
| Financial info → Purchase history | Yes (when Pro launches, via Google Play/RevenueCat) | App functionality | Yes |
| App info & performance → Crash logs | Yes (signed-in users) | Analytics / fixing errors | Yes |
| Device or other IDs (push token) | Yes (if notifications are on) | App functionality | Yes |
| Location, contacts, photos uploaded, messages | **No** | – | – |

Also answer: data **encrypted in transit: Yes** · users can **request deletion: Yes** ·
data **sold/shared with third parties: No** (Supabase, Google Play and RevenueCat are service providers, not "sharing").

## 6. Closed test (Test and release → Testing → Closed testing)

1. **Create track** → Countries: Kenya + any others you want → Testers: **Email list**, add at least
   **15 Gmail addresses** (a few always drop out – you need 12 who stay opted in for all 14 days).
2. **Create release** → upload the `.aab` → release name `1.0.0 (closed test)` → release notes:
   `First test version – please log a few trades and send feedback from Settings.`
3. Send the review → Google checks it (hours to a few days).
4. Share the **opt-in link** (Closed testing → Testers → "How testers join") with your testers. Each tester:
   opens the link with their tester Gmail → **Become a tester** → installs from Play → keeps it installed
   **14 days** and opens it now and then.
5. Where to find testers: friends and family with Android phones, your trading WhatsApp/Telegram groups,
   local trading communities. Ask them for honest feedback – Google asks about it later.
6. Day 14+: Dashboard → **Apply for production** → answer the questions about your test
   (how many testers, what feedback, what you changed). Approval usually takes up to 7 days.

## 7. After the closed test

- Fix what testers report → `eas build -p android --profile production` → upload to the closed track.
- When approved for production: create a **Production** release with the latest `.aab`.
- Pro subscriptions (later): create the subscription in Play Console → connect RevenueCat (DEPLOY.md Step 8)
  → set `PRO_FREE_DURING_BETA = false` → new build.

## Checklist before you press "Send for review"

- [ ] Placeholders replaced, pages live on GitHub Pages, links work on your phone
- [ ] `config.js`: Supabase URL + publishable key, PRIVACY_URL, TERMS_URL, SUPPORT_EMAIL
- [ ] `calendar` Edge Function deployed (JWT off) and `calendar.sql` run
- [ ] Reviewer account works (sign in on a second phone)
- [ ] Production `.aab` built with `--profile production`
- [ ] Listing texts, icon, feature graphic, 2+ screenshots
- [ ] App content: all sections green
- [ ] 15 tester emails added, opt-in link shared
