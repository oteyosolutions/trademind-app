/**
 * TradeMind ICT - online services configuration.
 *
 * Paste your keys here. Leave a value as "" to keep that feature switched off -
 * the app keeps working offline either way.
 */

// Supabase (login + cloud sync + cloud alerts): supabase.com -> your project -> Settings -> API
export const SUPABASE_URL = "https://iyhliwhzbswcjjfhirwh.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_uPknuBZZ0J4RwFdig4_inw_HTIFzAm0";

// RevenueCat (Pro subscriptions through Google Play Billing): app.revenuecat.com -> API keys
export const REVENUECAT_ANDROID_KEY = ""; // starts with "goog_"
export const PRO_ENTITLEMENT = "pro";      // entitlement identifier you create in RevenueCat

// While you run the Google Play closed test (12 testers x 14 days), unlock Pro for everyone.
// Set to false when you start charging.
export const PRO_FREE_DURING_BETA = true;

// Links shown in the app (host these pages, e.g. on GitHub Pages)
export const PRIVACY_URL = "https://oteyosolutions.github.io/trademind/privacy.html";
export const TERMS_URL = "https://oteyosolutions.github.io/trademind/terms.html";
export const SUPPORT_EMAIL = "PUT-YOUR-EMAIL-HERE";        // e.g. "support@yourdomain.com"

export const cloudConfigured = () => SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;
