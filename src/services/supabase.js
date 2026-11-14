import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, cloudConfigured } from "../config";

let client = null;

/** The Supabase client, or null when cloud is not configured in src/config.js. */
export function getSupabase() {
  if (!cloudConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function friendlyAuthError(error) {
  const msg = String((error && error.message) || error || "");
  if (/invalid login/i.test(msg)) return "Wrong email or password.";
  if (/already registered|already exists/i.test(msg)) return "An account with this email already exists - sign in instead.";
  if (/email not confirmed/i.test(msg)) return "Confirm your email first - check your inbox for the link.";
  if (/password/i.test(msg) && /6/.test(msg)) return "Password must be at least 6 characters.";
  if (/network|fetch/i.test(msg)) return "No internet connection. Try again when you are online.";
  return msg || "Something went wrong.";
}
