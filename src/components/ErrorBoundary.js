import React from "react";
import { SafeAreaView, ScrollView, Share, Text, TouchableOpacity } from "react-native";
import { styles } from "../theme";
import { APP_VERSION } from "../constants";
import { getSupabase } from "../services/supabase";

/** Sends an error report to Supabase when the user is signed in (fails silently otherwise). */
export async function reportError(error, extra) {
  try {
    const client = getSupabase();
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (!data || !data.session) return;
    await client.from("error_reports").insert([{
      message: String((error && error.message) || error).slice(0, 1000),
      stack: `${(error && error.stack) || ""}\n${extra || ""}`.slice(0, 4000),
      app_version: APP_VERSION,
    }]);
  } catch (e) {
    // never let error reporting crash the app
  }
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: "" };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const stack = (info && info.componentStack) || "";
    this.setState({ info: stack });
    reportError(error, stack);
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    const text = `TradeMind ICT v${APP_VERSION} error\n${error.message}\n${(error.stack || "").slice(0, 1500)}\n${info.slice(0, 1500)}`;
    return (
      <SafeAreaView style={styles.lockWrap}>
        <ScrollView contentContainerStyle={{ paddingVertical: 40 }}>
          <Text style={styles.brand}>TRADEMIND ICT</Text>
          <Text style={styles.pageTitle}>Something went wrong</Text>
          <Text style={styles.muted}>
            Your trades are safe on this phone. Tap "Try again". If it keeps happening, send the
            error report so it can be fixed.
          </Text>
          <Text style={[styles.small, { marginTop: 16 }]}>{error.message}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => this.setState({ error: null, info: "" })}>
            <Text style={styles.primaryText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => Share.share({ message: text }).catch(() => {})}>
            <Text style={styles.secondaryText}>Send error report</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }
}
