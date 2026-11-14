# TradeMind ICT v4 – Guide

## Install / update (cmd)

```
cd C:\Users\Kelvin\Desktop\SMC-ICT-Journal
mkdir ..\TradeMind-v3-backup
copy App.js ..\TradeMind-v3-backup\
xcopy src ..\TradeMind-v3-backup\src\ /E /I
tar -xf C:\Users\Kelvin\Downloads\trademind-app-v4.zip
npx expo install expo-image-picker
npx expo start
```

`expo-image-picker` (for chart screenshots) is the only new package. `npx expo install`
picks the version that matches your Expo SDK.

## What's in v4

| Area | Feature | Where |
|---|---|---|
| Account | Balance, currency (USD/EUR/GBP/KES), risk % | Settings, first-launch setup |
| Risk | Lot size from your stop (FX, JPY pairs, gold, crosses) | Journal + → Position size |
| Money | Each trade stores the amount risked; results in money and R | Trade cards, Home, Analysis |
| Psychology | Emotion before the trade | Journal + |
| Review | Followed plan?, mistake tags, lesson – when closing or editing | Close Trade / Edit |
| Management | Partial closes (blended R), stop to breakeven, undo partial | Open trade cards |
| Charts | Gallery screenshots (on this phone) + TradingView links (in backups) | Journal + |
| Analytics | Expectancy, payoff, best/worst, streaks | Analysis → Analytics |
| Analytics | Calendar heatmap, R distribution | Analysis → Analytics |
| Analytics | Breakdowns by weekday, hour, emotion, plan, mistakes | Analysis → Performance breakdown |
| Security | Optional 4–6 digit PIN, 30 s lock-out after 5 wrong tries | Settings → App lock |
| Setup | 3-step onboarding with disclaimer | First launch |

Your saved trades, alert decisions and scanner address carry over unchanged.

## What still needs work outside Expo Go

These need accounts or a custom build, so they are not in this version:

1. **Cloud backup + login (Supabase).** Create a free project at supabase.com; the app would
   sync trades to a `trades` table protected by row-level security so each user only sees
   their own data. Needs: Supabase URL + anon key.
2. **Alerts when away from home.** The scanner would post alerts to Supabase instead of only
   serving them on Wi-Fi, and the phone would get push notifications. Push notifications do
   **not** work in Expo Go on Android, so this needs a development build (step 4).
3. **Scanner running 24/5.** MT5 + `scan_signals.py` on a small Windows VPS (about $10–25/month)
   so alerts don't stop when your PC sleeps.
4. **Your own installable app (APK / Play Store).**
   ```
   npm install -g eas-cli
   eas login
   eas build:configure
   eas build -p android --profile preview      (APK you can install directly)
   eas build -p android --profile production   (for Google Play)
   ```
   Before Play Store release: app icon (1024×1024), splash screen, privacy policy URL, and a
   clear "not financial advice" statement. Google Play reviews finance-related apps carefully.
   Do not offer trade signals or copy-trading to the public without checking Capital Markets
   Authority (Kenya) requirements.

## If something breaks

Expo Go shows a red screen with a file name and line number – send that.
To go back to v3, copy `App.js` and the `src` folder back from `Desktop\TradeMind-v3-backup`.
Your data is compatible both ways (v3 simply ignores the new fields).
