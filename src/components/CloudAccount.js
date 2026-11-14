import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { C, styles } from "../theme";
import { useApp } from "../context/AppContext";
import { Field } from "./ui";

export default function CloudAccount() {
  const {
    cloudReady, user, authBusy, signUp, signIn, signOut, resetPassword, deleteAccount, syncNow,
    syncStatus, syncState, isPro, setTab, enablePush, pushStatus, importMt5FromPc,
  } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!cloudReady) {
    return (
      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Cloud account</Text>
        <Text style={styles.muted}>
          Cloud login and sync are not switched on in this build yet (add your Supabase keys to
          src/config.js). Your journal works fully offline - keep using backups.
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.calculator}>
        <Text style={styles.menuTitle}>Cloud account</Text>
        <Text style={styles.muted}>
          Sign in to back up your journal automatically and use it on any phone.
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Text style={[styles.label, { marginTop: 17 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor="#65738B"
          secureTextEntry
          autoCapitalize="none"
        />
        <View style={[styles.choices, { marginTop: 14 }]}>
          <TouchableOpacity
            style={[styles.choice, styles.choiceActive, authBusy && { opacity: 0.5 }]}
            disabled={authBusy}
            onPress={() => signIn(email, password)}
          >
            <Text style={[styles.choiceText, styles.choiceTextActive]}>{authBusy ? "Please wait..." : "Sign in"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.choice} disabled={authBusy} onPress={() => signUp(email, password)}>
            <Text style={styles.choiceText}>Create account</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => resetPassword(email)}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pending = syncState.dirty.length + Object.keys(syncState.tombstones).length;
  const statusColor = syncStatus.state === "error" ? C.red : syncStatus.state === "ok" ? C.green : C.muted;

  return (
    <View style={styles.calculator}>
      <Text style={styles.menuTitle}>Cloud account</Text>
      <Text style={styles.muted}>Signed in as {user.email}</Text>
      {isPro ? (
        <>
          <Text style={[styles.small, { color: statusColor }]}>
            {syncStatus.message ||
              (syncState.lastSyncAt ? `Last sync ${new Date(syncState.lastSyncAt).toLocaleString()}` : "Not synced yet")}
            {pending ? ` · ${pending} change(s) waiting` : ""}
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => syncNow(true)}>
            <Text style={styles.secondaryText}>{syncStatus.state === "syncing" ? "Syncing..." : "Sync now"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={enablePush}>
            <Text style={styles.secondaryText}>Turn on alert notifications</Text>
          </TouchableOpacity>
          {!!pushStatus && <Text style={styles.small}>{pushStatus}</Text>}
          <TouchableOpacity style={styles.secondaryButton} onPress={importMt5FromPc}>
            <Text style={styles.secondaryText}>Import my MT5 trades from PC</Text>
          </TouchableOpacity>
          <Text style={styles.small}>
            MT5 import needs scan_signals.py running on your PC (same Wi-Fi). With cloud on, the
            PC scanner also uploads your MT5 trades automatically.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.small}>Cloud sync, MT5 import and alert notifications are Pro features.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab("Pro")}>
            <Text style={styles.secondaryText}>See TradeMind Pro</Text>
          </TouchableOpacity>
        </>
      )}
      <View style={[styles.choices, { marginTop: 14 }]}>
        <TouchableOpacity style={styles.choice} onPress={signOut}>
          <Text style={styles.choiceText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.deleteButton, { flex: 1, marginTop: 0 }]} onPress={deleteAccount}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.small}>Signing out keeps your trades on this phone.</Text>
    </View>
  );
}
